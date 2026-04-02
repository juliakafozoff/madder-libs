const Story = require("../models/Story");
const StoryResult = require("../models/StoryResult");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

const sessions = new Map();
const disconnectTimers = new Map();

function getUserIdFromSocket(socket) {
  return socket.userId || null;
}

function getGapInfo(story, gapIndex) {
  let currentGap = 0;
  for (const piece of story) {
    if (typeof piece === "object" && piece.class === "gap") {
      if (currentGap === gapIndex) {
        return {
          wordType: piece.type || "Word",
          hint: piece.subForm || piece.type || "Word",
          gapIndex: currentGap,
        };
      }
      currentGap++;
    }
  }
  return null;
}

function countGaps(story) {
  let count = 0;
  for (const piece of story) {
    if (typeof piece === "object" && piece.class === "gap") {
      count++;
    }
  }
  return count;
}

function assembleResult(story, filledWords) {
  let gapIndex = 0;
  const parts = [];
  for (const piece of story) {
    if (typeof piece === "object" && piece.class === "gap") {
      parts.push(filledWords[gapIndex] || "[blank]");
      gapIndex++;
    } else if (typeof piece === "string") {
      parts.push(piece);
    } else if (typeof piece === "object" && piece.text) {
      parts.push(piece.text);
    }
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function initGameSocket(io) {
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
    socket.on("host:create", async ({ storyId, inviteCode }) => {
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

        if (sessions.has(sessionId)) {
          const existing = sessions.get(sessionId);
          if (existing.hostSocketId === socket.id) {
            socket.emit("session:created", {
              sessionId,
              title: existing.title,
              story: existing.story,
              totalGaps: existing.totalGaps,
              status: existing.status,
            });
            return;
          }
        }

        const totalGaps = countGaps(story.story);
        const session = {
          sessionId,
          storyId: story.storyId,
          story: story.story,
          title: story.title || "Untitled Story",
          hostSocketId: socket.id,
          hostUserId: getUserIdFromSocket(socket),
          fillerSocketId: null,
          fillerUserId: null,
          currentGapIndex: 0,
          totalGaps,
          filledWords: [],
          status: "waiting",
        };

        sessions.set(sessionId, session);
        socket.join(sessionId);
        socket.sessionId = sessionId;
        socket.role = "host";

        socket.emit("session:created", {
          sessionId,
          title: session.title,
          story: session.story,
          totalGaps: session.totalGaps,
          status: session.status,
        });
      } catch (err) {
        socket.emit("error", { message: "Failed to create session" });
      }
    });

    socket.on("filler:join", ({ inviteCode }) => {
      const session = sessions.get(inviteCode);
      if (!session) {
        socket.emit("error", { message: "No live game found for this code" });
        return;
      }
      if (session.status !== "waiting") {
        socket.emit("error", { message: "Game already in progress" });
        return;
      }

      session.fillerSocketId = socket.id;
      session.fillerUserId = getUserIdFromSocket(socket);
      session.status = "playing";
      socket.join(inviteCode);
      socket.sessionId = inviteCode;
      socket.role = "filler";

      const gapInfo = getGapInfo(session.story, 0);
      io.to(inviteCode).emit("session:started", {
        sessionId: inviteCode,
        title: session.title,
        totalGaps: session.totalGaps,
        currentGapIndex: 0,
        gap: gapInfo,
      });
    });

    socket.on("filler:submit-word", ({ word }) => {
      const sessionId = socket.sessionId;
      if (!sessionId) return;
      const session = sessions.get(sessionId);
      if (!session || session.status !== "playing") return;
      if (socket.id !== session.fillerSocketId) return;

      session.filledWords.push(word);
      session.currentGapIndex++;

      io.to(session.hostSocketId).emit("word:filled", {
        word,
        gapIndex: session.currentGapIndex - 1,
        filledCount: session.filledWords.length,
        totalGaps: session.totalGaps,
      });

      if (session.currentGapIndex >= session.totalGaps) {
        session.status = "revealing";
        const resultText = assembleResult(session.story, session.filledWords);
        const resultId = uuidv4();
        session.resultId = resultId;
        session.resultText = resultText;

        StoryResult.create({
          resultId,
          templateId: session.storyId,
          title: session.title,
          resultText,
          player: session.fillerUserId || null,
        }).catch(() => {});

        io.to(sessionId).emit("game:complete", {
          resultText,
          resultId,
          title: session.title,
          filledWords: session.filledWords,
          story: session.story,
        });
      } else {
        const nextGap = getGapInfo(session.story, session.currentGapIndex);
        socket.emit("gap:next", {
          gap: nextGap,
          currentGapIndex: session.currentGapIndex,
          totalGaps: session.totalGaps,
        });
      }
    });

    socket.on("host:reveal-next", ({ sentenceIndex }) => {
      const sessionId = socket.sessionId;
      if (!sessionId) return;
      const session = sessions.get(sessionId);
      if (!session || session.status !== "revealing") return;
      if (socket.id !== session.hostSocketId) return;

      io.to(sessionId).emit("reveal:sentence", { sentenceIndex });
    });

    socket.on("host:reveal-all", () => {
      const sessionId = socket.sessionId;
      if (!sessionId) return;
      const session = sessions.get(sessionId);
      if (!session || session.status !== "revealing") return;
      if (socket.id !== session.hostSocketId) return;

      session.status = "done";
      io.to(sessionId).emit("reveal:complete");
    });

    socket.on("session:state", () => {
      const sessionId = socket.sessionId;
      if (!sessionId) return;
      const session = sessions.get(sessionId);
      if (!session) {
        socket.emit("session:state", { found: false });
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
        const gap = getGapInfo(session.story, session.currentGapIndex);
        base.gap = gap;
        if (session.resultText) {
          base.resultText = session.resultText;
          base.resultId = session.resultId;
        }
      }

      socket.emit("session:state", base);
    });

    socket.on("disconnect", () => {
      const sessionId = socket.sessionId;
      if (!sessionId) return;
      const session = sessions.get(sessionId);
      if (!session) return;

      const role = socket.role;
      const partnerSocketId =
        role === "host" ? session.fillerSocketId : session.hostSocketId;

      if (partnerSocketId) {
        io.to(partnerSocketId).emit("partner:disconnected", { role });
      }

      const timerKey = `${sessionId}:${role}`;
      disconnectTimers.set(
        timerKey,
        setTimeout(() => {
          disconnectTimers.delete(timerKey);
          const s = sessions.get(sessionId);
          if (!s) return;
          if (role === "host" && s.hostSocketId === socket.id) {
            sessions.delete(sessionId);
            if (partnerSocketId) {
              io.to(partnerSocketId).emit("session:ended", {
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
                io.to(s.hostSocketId).emit("session:reset", {
                  reason: "Partner left, waiting for a new player",
                });
              }
            }
          }
        }, 2 * 60 * 1000)
      );
    });

    socket.on("rejoin", ({ sessionId: rejoinId, role }) => {
      const session = sessions.get(rejoinId);
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
        io.to(partnerSocketId).emit("partner:reconnected", { role });
      }

      socket.emit("session:state", {
        found: true,
        sessionId: session.sessionId,
        title: session.title,
        status: session.status,
        currentGapIndex: session.currentGapIndex,
        totalGaps: session.totalGaps,
        filledCount: session.filledWords.length,
        ...(role === "host"
          ? {
              story: session.story,
              filledWords: session.filledWords,
              resultText: session.resultText,
              resultId: session.resultId,
            }
          : {
              gap: getGapInfo(session.story, session.currentGapIndex),
              resultText: session.resultText,
              resultId: session.resultId,
            }),
      });
    });
  });
}

module.exports = initGameSocket;
