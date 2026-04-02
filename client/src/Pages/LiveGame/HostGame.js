import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import copy from "clipboard-copy";
import { ClipboardCopyIcon } from "@heroicons/react/outline";
import { getSocket, disconnectSocket } from "../../services/socket";
import PageShell from "../../components/ui/PageShell";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import RevealView from "./RevealView";

const HostGame = () => {
  const { inviteCode } = useParams();
  const navigate = useNavigate();
  const socketRef = useRef(null);

  const [status, setStatus] = useState("connecting");
  const [title, setTitle] = useState("");
  const [story, setStory] = useState([]);
  const [totalGaps, setTotalGaps] = useState(0);
  const [filledWords, setFilledWords] = useState([]);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [partnerDisconnected, setPartnerDisconnected] = useState(false);

  // Reveal data
  const [revealData, setRevealData] = useState(null);

  const getInviteLink = useCallback(
    () => `${window.location.origin}/start/${inviteCode}`,
    [inviteCode]
  );

  const copyInviteLink = useCallback(() => {
    copy(getInviteLink());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [getInviteLink]);

  const shareInviteLink = useCallback(async () => {
    const shareData = {
      title: "Play my Glad Libs story!",
      text: "Come play my Glad Libs story live!",
      url: getInviteLink(),
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } catch (err) {
        if (err.name !== "AbortError") copyInviteLink();
      }
    } else {
      copyInviteLink();
    }
  }, [getInviteLink, copyInviteLink]);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    // Try to rejoin existing session first
    const savedSession = localStorage.getItem(`liveSession_${inviteCode}`);
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed.role === "host") {
          socket.emit("rejoin", { sessionId: inviteCode, role: "host" });
        } else {
          socket.emit("host-game", { inviteCode });
        }
      } catch {
        socket.emit("host-game", { inviteCode });
      }
    } else {
      socket.emit("host-game", { inviteCode });
    }

    socket.on("session-created", (data) => {
      setStatus(data.status);
      setTitle(data.title);
      setStory(data.story);
      setTotalGaps(data.totalGaps);
      localStorage.setItem(`liveSession_${inviteCode}`, JSON.stringify({ role: "host", inviteCode }));
    });

    socket.on("partner-joined", () => {
      setStatus("playing");
      setPartnerDisconnected(false);
    });

    socket.on("word-received", (data) => {
      setFilledWords((prev) => {
        const next = [...prev];
        next[data.gapIndex] = data.word;
        return next;
      });
    });

    socket.on("all-words-submitted", (data) => {
      setStatus("revealing");
      setRevealData(data);
      if (data.filledWords) setFilledWords(data.filledWords);
      if (data.story) setStory(data.story);
    });

    socket.on("story-revealed", (data) => {
      setStatus("done");
      setRevealData(data);
      localStorage.removeItem(`liveSession_${inviteCode}`);
    });

    socket.on("session-state", (data) => {
      if (!data.found) {
        setError("Session not found");
        setStatus("error");
        localStorage.removeItem(`liveSession_${inviteCode}`);
        return;
      }
      setTitle(data.title);
      setTotalGaps(data.totalGaps);
      if (data.story) setStory(data.story);
      if (data.filledWords) setFilledWords(data.filledWords);
      if (data.status === "done" || (data.status === "revealing" && data.resultText)) {
        setRevealData({
          resultText: data.resultText,
          resultId: data.resultId,
          title: data.title,
          story: data.story,
          filledWords: data.filledWords,
        });
      }
      setStatus(data.status);
    });

    socket.on("partner-disconnected", () => {
      setPartnerDisconnected(true);
    });

    socket.on("partner-reconnected", () => {
      setPartnerDisconnected(false);
    });

    socket.on("session-reset", () => {
      setStatus("waiting");
      setFilledWords([]);
      setPartnerDisconnected(false);
    });

    socket.on("session-ended", ({ reason }) => {
      setError(reason || "Session ended");
      setStatus("error");
      localStorage.removeItem(`liveSession_${inviteCode}`);
    });

    socket.on("error", ({ message }) => {
      setError(message);
    });

    return () => {
      socket.off("session-created");
      socket.off("partner-joined");
      socket.off("word-received");
      socket.off("all-words-submitted");
      socket.off("story-revealed");
      socket.off("session-state");
      socket.off("partner-disconnected");
      socket.off("partner-reconnected");
      socket.off("session-reset");
      socket.off("session-ended");
      socket.off("error");
      disconnectSocket();
    };
  }, [inviteCode]);

  const handleRevealStory = () => {
    socketRef.current?.emit("reveal-story");
  };

  const renderStoryWithBlanks = () => {
    let gapIndex = 0;
    return story.map((piece, i) => {
      if (typeof piece === "object" && piece.class === "gap") {
        const currentGapIndex = gapIndex;
        gapIndex++;
        const word = filledWords[currentGapIndex];
        if (word) {
          return (
            <span key={i} className="filled-word" style={{ animation: "pop-in 0.3s ease-out" }}>
              {word}
            </span>
          );
        }
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              minWidth: "80px",
              borderBottom: "2px dashed var(--text-secondary)",
              margin: "0 4px",
              padding: "2px 8px",
              color: "var(--text-secondary)",
              fontSize: "14px",
              fontStyle: "italic",
            }}
          >
            {piece.type || "___"}
          </span>
        );
      }
      if (typeof piece === "string") {
        return <span key={i}> {piece} </span>;
      }
      if (typeof piece === "object" && piece.text) {
        return <span key={i}> {piece.text} </span>;
      }
      return null;
    });
  };

  const filledCount = filledWords.filter(Boolean).length;

  // Revealed state — shared RevealView
  if (status === "done" && revealData) {
    return (
      <RevealView
        title={revealData.title || title}
        story={revealData.story || story}
        filledWords={revealData.filledWords || filledWords}
        resultText={revealData.resultText}
        resultId={revealData.resultId}
        inviteCode={inviteCode}
        isHost={true}
      />
    );
  }

  if (error && status === "error") {
    return (
      <PageShell>
        <Card>
          <h1 className="ui-heading ui-heading--small">{error}</h1>
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </Card>
      </PageShell>
    );
  }

  if (status === "connecting") {
    return (
      <PageShell>
        <Card>
          <h1 className="ui-heading ui-heading--small">Connecting...</h1>
        </Card>
      </PageShell>
    );
  }

  if (status === "waiting") {
    return (
      <PageShell>
        <Card>
          <h1 className="ui-heading ui-heading--small">{title}</h1>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "var(--spacing-md)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)" }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  backgroundColor: "var(--color-primary)",
                  animation: "pulse-dot 1.5s ease-in-out infinite",
                }}
              />
              <span className="ui-text ui-text--secondary" style={{ fontSize: "16px" }}>
                Waiting for a partner to join...
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--spacing-md)",
                padding: "var(--spacing-md)",
                backgroundColor: "#f9fafb",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-color)",
                width: "100%",
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: "14px",
                    color: "var(--text-secondary)",
                    marginBottom: "var(--spacing-xs)",
                  }}
                >
                  Invite Code:
                </div>
                <code
                  style={{
                    fontFamily: "monospace",
                    fontSize: "24px",
                    fontWeight: "var(--font-weight-semibold)",
                    color: "var(--text-primary)",
                    letterSpacing: "2px",
                  }}
                >
                  {inviteCode}
                </code>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-xs)" }}>
                <div style={{ position: "relative" }}>
                  <button
                    onClick={copyInviteLink}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: "var(--spacing-sm)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "var(--radius-sm)",
                      transition: "background-color var(--transition-fast)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.05)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    aria-label="Copy invite link"
                  >
                    <ClipboardCopyIcon className="w-6 h-6" style={{ color: "var(--color-primary)" }} />
                  </button>
                  {copied && (
                    <div
                      style={{
                        position: "absolute",
                        top: "-32px",
                        right: "0",
                        backgroundColor: "var(--text-primary)",
                        color: "var(--text-white)",
                        padding: "var(--spacing-xs) var(--spacing-sm)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "12px",
                        fontWeight: "var(--font-weight-medium)",
                        whiteSpace: "nowrap",
                        pointerEvents: "none",
                        zIndex: 10,
                      }}
                    >
                      Copied!
                    </div>
                  )}
                </div>
                <div style={{ position: "relative" }}>
                  <button
                    onClick={shareInviteLink}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: "var(--spacing-sm)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "var(--radius-sm)",
                      transition: "background-color var(--transition-fast)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.05)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    aria-label="Share invite link"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      style={{ color: "var(--color-primary)", width: "24px", height: "24px" }}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                      />
                    </svg>
                  </button>
                  {shared && (
                    <div
                      style={{
                        position: "absolute",
                        top: "-32px",
                        right: "0",
                        backgroundColor: "var(--text-primary)",
                        color: "var(--text-white)",
                        padding: "var(--spacing-xs) var(--spacing-sm)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "12px",
                        fontWeight: "var(--font-weight-medium)",
                        whiteSpace: "nowrap",
                        pointerEvents: "none",
                        zIndex: 10,
                      }}
                    >
                      Shared!
                    </div>
                  )}
                </div>
              </div>
            </div>

            <p className="ui-text ui-text--secondary" style={{ fontSize: "13px", textAlign: "center" }}>
              Share this code with a friend — they'll fill in the words blind!
            </p>
          </div>
        </Card>

        <style>{`
          @keyframes pulse-dot {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.3); }
          }
        `}</style>
      </PageShell>
    );
  }

  if (status === "playing" || status === "revealing") {
    return (
      <PageShell>
        <Card wide>
          <h1 className="ui-heading ui-heading--small">{title}</h1>

          {partnerDisconnected && (
            <div
              style={{
                padding: "var(--spacing-sm) var(--spacing-md)",
                backgroundColor: "#fef3c7",
                border: "1px solid #fcd34d",
                borderRadius: "var(--radius-md)",
                color: "#92400e",
                fontSize: "14px",
                textAlign: "center",
              }}
            >
              Your partner disconnected — waiting for them to come back...
            </div>
          )}

          <div
            style={{
              padding: "var(--spacing-sm) var(--spacing-md)",
              backgroundColor: "#f0f9ff",
              borderRadius: "var(--radius-md)",
              textAlign: "center",
              fontSize: "14px",
              color: "var(--text-secondary)",
            }}
          >
            {status === "revealing"
              ? `All ${totalGaps} words filled!`
              : `Word ${Math.min(filledCount + 1, totalGaps)} of ${totalGaps} — waiting for partner...`}
          </div>

          <div
            style={{
              fontSize: "18px",
              lineHeight: "1.8",
              color: "var(--text-primary)",
              padding: "var(--spacing-lg)",
              minHeight: "100px",
            }}
          >
            {renderStoryWithBlanks()}
          </div>

          {status === "playing" && (
            <p className="ui-text ui-text--secondary" style={{ textAlign: "center", fontSize: "14px" }}>
              Sit back and watch your partner fill in the blanks...
            </p>
          )}

          {status === "revealing" && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: "var(--spacing-md)" }}>
              <Button onClick={handleRevealStory} style={{ maxWidth: "240px" }}>
                Reveal Story
              </Button>
            </div>
          )}
        </Card>

        <style>{`
          @keyframes pop-in {
            0% { transform: scale(0.5); opacity: 0; }
            70% { transform: scale(1.1); }
            100% { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </PageShell>
    );
  }

  return null;
};

export default HostGame;
