const sessions = new Map();

function countGaps(story) {
  let count = 0;
  for (const piece of story) {
    if (typeof piece === "object" && piece.class === "gap") count++;
  }
  return count;
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

function createSession(inviteCode, { storyId, story, title, hostSocketId, hostUserId }) {
  const totalGaps = countGaps(story);
  const session = {
    sessionId: inviteCode,
    storyId,
    story,
    title: title || "Untitled Story",
    hostSocketId,
    hostUserId,
    fillerSocketId: null,
    fillerUserId: null,
    currentGapIndex: 0,
    totalGaps,
    filledWords: [],
    status: "waiting",
    resultId: null,
    resultText: null,
  };
  sessions.set(inviteCode, session);
  return session;
}

function joinSession(inviteCode, { fillerSocketId, fillerUserId }) {
  const session = sessions.get(inviteCode);
  if (!session) return { error: "No live game found for this code" };
  if (session.status !== "waiting") return { error: "This game is already in progress" };

  session.fillerSocketId = fillerSocketId;
  session.fillerUserId = fillerUserId;
  session.status = "playing";
  return { session };
}

function getSession(inviteCode) {
  return sessions.get(inviteCode) || null;
}

function submitWord(inviteCode, word) {
  const session = sessions.get(inviteCode);
  if (!session || session.status !== "playing") return null;

  session.filledWords.push(word);
  session.currentGapIndex++;

  const allDone = session.currentGapIndex >= session.totalGaps;
  if (allDone) {
    session.status = "revealing";
    session.resultText = assembleResult(session.story, session.filledWords);
  }

  return {
    gapIndex: session.currentGapIndex - 1,
    filledCount: session.filledWords.length,
    totalGaps: session.totalGaps,
    allDone,
  };
}

function getNextPrompt(inviteCode) {
  const session = sessions.get(inviteCode);
  if (!session) return null;
  return {
    gap: getGapInfo(session.story, session.currentGapIndex),
    currentGapIndex: session.currentGapIndex,
    totalGaps: session.totalGaps,
  };
}

function getCompletedStory(inviteCode) {
  const session = sessions.get(inviteCode);
  if (!session) return null;
  return {
    resultText: session.resultText || assembleResult(session.story, session.filledWords),
    filledWords: session.filledWords,
    story: session.story,
    title: session.title,
  };
}

function removeSession(inviteCode) {
  sessions.delete(inviteCode);
}

module.exports = {
  createSession,
  joinSession,
  getSession,
  submitWord,
  getNextPrompt,
  getCompletedStory,
  removeSession,
  getGapInfo,
};
