const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const Story = require("../models/Story");
const StoryResult = require("../models/StoryResult");
const {
  createSession,
  joinSession,
  getSession,
  submitWord,
  getNextPrompt,
  getCompletedStory,
  removeSession,
  getGapInfo,
} = require("../services/gameSession");

const disconnectTimers = new Map();

function getUserIdFromSocket(socket) {
  return socket.userId || null;
}

function initGameHandler(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
        if (!err && decoded) {
          socket.userId = decoded.id;
        }
        next();
      });
    } else {
      next();
    }
  });

  io.on("connection", (socket) => {
    // host-game: host creates a live session for their story
    socket.on("host-game", async ({ storyId, inviteCode }) => {
      try {
        const isInviteCode = /^[A-Z0-9]{6}$/.test(inviteCode);
        let story;
        if (isInviteCode) {
          story = await Story.findOne({ inviteCode });
        }
        if (!story) {
          story = await Story.findOne({ storyId });
        }
        if (!story || !story.story || story.story.length === 0) {
          socket.emit("error", { message: "Story not found or has no content" });
          return;
        }

        const sessionId = inviteCode || story.inviteCode;
        if (!sessionId) {
          socket.emit("error", { message: "No invite code available" });
          return;
        }

        const existing = getSession(sessionId);
        if (existing && existing.hostSocketId === socket.id) {
          socket.emit("session-created", {
            sessionId,
            title: existing.title,
            story: existing.story,
            totalGaps: existing.totalGaps,
            status: existing.status,
          });
          return;
        }

        if (existing) {
          removeSession(sessionId);
        }

        const session = createSession(sessionId, {
          storyId: story.storyId,
          story: story.story,
          title: story.title,
          hostSocketId: socket.id,
          hostUserId: getUserIdFromSocket(socket),
        });

        socket.join(sessionId);
        socket.sessionId = sessionId;
        socket.role = "host";

        socket.emit("session-created", {
          sessionId,
          title: session.title,
          story: session.story,
          totalGaps: session.totalGaps,
          status: session.status,
        });
      } catch (err) {
        console.error("host-game error:", err);
        socket.emit("error", { message: "Failed to create session" });
      }
    });

    // join-game: partner joins by inviteCode
    socket.on("join-game", ({ inviteCode }) => {
      const result = joinSession(inviteCode, {
        fillerSocketId: socket.id,
        fillerUserId: getUserIdFromSocket(socket),
      });

      if (result.error) {
        socket.emit("join-error", { message: result.error });
        return;
      }

      const session = result.session;
      socket.join(inviteCode);
      socket.sessionId = inviteCode;
      socket.role = "filler";

      io.to(session.hostSocketId).emit("partner-joined");

      const gapInfo = getGapInfo(session.story, 0);
      socket.emit("request-word", {
        gap: gapInfo,
        currentGapIndex: 0,
        totalGaps: session.totalGaps,
      });
    });

    // submit-word: partner submits a word
    socket.on("submit-word", ({ word }) => {
      const sessionId = socket.sessionId;
      if (!sessionId) return;
      const session = getSession(sessionId);
      if (!session || session.status !== "playing") return;
      if (socket.id !== session.fillerSocketId) return;

      const result = submitWord(sessionId, word);
      if (!result) return;

      io.to(session.hostSocketId).emit("word-received", {
        word,
        gapIndex: result.gapIndex,
        filledCount: result.filledCount,
        totalGaps: result.totalGaps,
      });

      if (result.allDone) {
        const completed = getCompletedStory(sessionId);
        const resultId = uuidv4();
        session.resultId = resultId;

        StoryResult.create({
          resultId,
          templateId: session.storyId,
          title: session.title,
          resultText: completed.resultText,
          player: session.fillerUserId || null,
        }).catch((err) => {
          console.error("Failed to save story result:", err);
        });

        io.to(sessionId).emit("all-words-submitted", {
          resultText: completed.resultText,
          resultId,
          title: completed.title,
          filledWords: completed.filledWords,
          story: completed.story,
        });
      } else {
        const next = getNextPrompt(sessionId);
        socket.emit("request-word", next);
      }
    });

    // reveal-story: either player triggers the reveal
    socket.on("reveal-story", () => {
      const sessionId = socket.sessionId;
      if (!sessionId) return;
      const session = getSession(sessionId);
      if (!session) return;
      if (session.status !== "revealing") return;

      session.status = "done";
      const completed = getCompletedStory(sessionId);
      io.to(sessionId).emit("story-revealed", {
        resultText: completed.resultText,
        filledWords: completed.filledWords,
        story: completed.story,
        title: completed.title,
        resultId: session.resultId,
      });
    });

    // check-live-session: join flow checks if a live session exists
    socket.on("check-live-session", ({ inviteCode }) => {
      const session = getSession(inviteCode);
      if (session && session.status === "waiting") {
        socket.emit("live-session-found", { inviteCode, title: session.title });
      } else {
        socket.emit("live-session-not-found", { inviteCode });
      }
    });

    // disconnect: clean up with 30-second grace period
    socket.on("disconnect", () => {
      const sessionId = socket.sessionId;
      if (!sessionId) return;
      const session = getSession(sessionId);
      if (!session) return;

      const role = socket.role;
      const partnerSocketId =
        role === "host" ? session.fillerSocketId : session.hostSocketId;

      if (partnerSocketId) {
        io.to(partnerSocketId).emit("partner-disconnected", { role });
      }

      const timerKey = `${sessionId}:${role}`;
      disconnectTimers.set(
        timerKey,
        setTimeout(() => {
          disconnectTimers.delete(timerKey);
          const s = getSession(sessionId);
          if (!s) return;

          if (role === "host" && s.hostSocketId === socket.id) {
            removeSession(sessionId);
            if (partnerSocketId) {
              io.to(partnerSocketId).emit("session-ended", {
                reason: "Host left the game",
              });
            }
          }
          if (role === "filler" && s.fillerSocketId === socket.id) {
            if (s.status === "waiting" || s.status === "playing") {
              s.fillerSocketId = null;
              s.fillerUserId = null;
              s.status = "waiting";
              s.currentGapIndex = 0;
              s.filledWords = [];
              if (s.hostSocketId) {
                io.to(s.hostSocketId).emit("session-reset", {
                  reason: "Partner left, waiting for a new player",
                });
              }
            }
          }
        }, 30 * 1000)
      );
    });

    // rejoin: reconnect after disconnect
    socket.on("rejoin", ({ sessionId: rejoinId, role }) => {
      const session = getSession(rejoinId);
      if (!session) {
        socket.emit("error", { message: "Session expired" });
        return;
      }

      const timerKey = `${rejoinId}:${role}`;
      const timer = disconnectTimers.get(timerKey);
      if (timer) {
        clearTimeout(timer);
        disconnectTimers.delete(timerKey);
      }

      socket.join(rejoinId);
      socket.sessionId = rejoinId;
      socket.role = role;

      if (role === "host") {
        session.hostSocketId = socket.id;
        session.hostUserId = getUserIdFromSocket(socket);
      } else {
        session.fillerSocketId = socket.id;
        session.fillerUserId = getUserIdFromSocket(socket);
      }

      const partnerSocketId =
        role === "host" ? session.fillerSocketId : session.hostSocketId;
      if (partnerSocketId) {
        io.to(partnerSocketId).emit("partner-reconnected", { role });
      }

      const base = {
        found: true,
        sessionId: session.sessionId,
        title: session.title,
        status: session.status,
        currentGapIndex: session.currentGapIndex,
        totalGaps: session.totalGaps,
        filledCount: session.filledWords.length,
      };

      if (role === "host") {
        base.story = session.story;
        base.filledWords = session.filledWords;
        if (session.resultText) {
          base.resultText = session.resultText;
          base.resultId = session.resultId;
        }
      } else {
        base.gap = getGapInfo(session.story, session.currentGapIndex);
        if (session.resultText) {
          base.resultText = session.resultText;
          base.resultId = session.resultId;
        }
      }

      socket.emit("session-state", base);
    });

    // session-state: get current game state (for reconnection)
    socket.on("get-session-state", () => {
      const sessionId = socket.sessionId;
      if (!sessionId) return;
      const session = getSession(sessionId);
      if (!session) {
        socket.emit("session-state", { found: false });
        return;
      }

      const base = {
        found: true,
        sessionId: session.sessionId,
        title: session.title,
        status: session.status,
        currentGapIndex: session.currentGapIndex,
        totalGaps: session.totalGaps,
        filledCount: session.filledWords.length,
      };

      if (socket.role === "host") {
        base.story = session.story;
        base.filledWords = session.filledWords;
        if (session.resultText) {
          base.resultText = session.resultText;
          base.resultId = session.resultId;
        }
      } else {
        base.gap = getGapInfo(session.story, session.currentGapIndex);
        if (session.resultText) {
          base.resultText = session.resultText;
          base.resultId = session.resultId;
        }
      }

      socket.emit("session-state", base);
    });
  });
}

module.exports = initGameHandler;
