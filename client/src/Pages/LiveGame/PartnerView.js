import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getSocket, disconnectSocket } from "../../services/socket";
import PageShell from "../../components/ui/PageShell";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import TextInput from "../../components/ui/TextInput";
import RevealView from "./RevealView";

function getArticle(label) {
  return /^[aeiou]/i.test(label.trim()) ? "an" : "a";
}

const PartnerView = () => {
  const { inviteCode } = useParams();
  const navigate = useNavigate();
  const socketRef = useRef(null);

  const [status, setStatus] = useState("connecting"); // connecting, playing, waiting-reveal, revealed, error
  const [wordInput, setWordInput] = useState("");
  const [currentGap, setCurrentGap] = useState(null);
  const [currentGapIndex, setCurrentGapIndex] = useState(0);
  const [totalGaps, setTotalGaps] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [error, setError] = useState(null);
  const [partnerDisconnected, setPartnerDisconnected] = useState(false);

  // Reveal data
  const [revealData, setRevealData] = useState(null);

  const inputRef = useRef(null);

  const focusInput = useCallback(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    // Check for existing session to rejoin
    const savedSession = localStorage.getItem(`liveSession_${inviteCode}`);
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed.role === "filler") {
          socket.emit("rejoin", { sessionId: inviteCode, role: "filler" });
        } else {
          socket.emit("join-game", { inviteCode });
        }
      } catch {
        socket.emit("join-game", { inviteCode });
      }
    } else {
      socket.emit("join-game", { inviteCode });
    }

    socket.on("request-word", (data) => {
      setStatus("playing");
      setCurrentGap(data.gap);
      setCurrentGapIndex(data.currentGapIndex);
      setTotalGaps(data.totalGaps);
      localStorage.setItem(`liveSession_${inviteCode}`, JSON.stringify({ role: "filler", inviteCode }));
      focusInput();
    });

    socket.on("all-words-submitted", (data) => {
      setStatus("waiting-reveal");
      setRevealData(data);
    });

    socket.on("story-revealed", (data) => {
      setStatus("revealed");
      setRevealData(data);
      localStorage.removeItem(`liveSession_${inviteCode}`);
    });

    socket.on("session-state", (data) => {
      if (!data.found) {
        setError("Session not found. It may have expired.");
        setStatus("error");
        localStorage.removeItem(`liveSession_${inviteCode}`);
        return;
      }
      if (data.status === "playing") {
        setStatus("playing");
        setCurrentGap(data.gap);
        setCurrentGapIndex(data.currentGapIndex);
        setTotalGaps(data.totalGaps);
        focusInput();
      } else if (data.status === "revealing") {
        setStatus("waiting-reveal");
        if (data.resultText) {
          setRevealData({
            resultText: data.resultText,
            resultId: data.resultId,
            title: data.title,
          });
        }
      } else if (data.status === "done") {
        setStatus("revealed");
        if (data.resultText) {
          setRevealData({
            resultText: data.resultText,
            resultId: data.resultId,
            title: data.title,
          });
        }
        localStorage.removeItem(`liveSession_${inviteCode}`);
      }
    });

    socket.on("join-error", ({ message }) => {
      setError(message);
      setStatus("error");
    });

    socket.on("error", ({ message }) => {
      setError(message);
    });

    socket.on("partner-disconnected", () => {
      setPartnerDisconnected(true);
    });

    socket.on("partner-reconnected", () => {
      setPartnerDisconnected(false);
    });

    socket.on("session-ended", ({ reason }) => {
      setError(reason || "Session ended");
      setStatus("error");
      localStorage.removeItem(`liveSession_${inviteCode}`);
    });

    socket.on("session-reset", () => {
      setStatus("error");
      setError("Session was reset. Please rejoin.");
      localStorage.removeItem(`liveSession_${inviteCode}`);
    });

    return () => {
      socket.off("request-word");
      socket.off("all-words-submitted");
      socket.off("story-revealed");
      socket.off("session-state");
      socket.off("join-error");
      socket.off("error");
      socket.off("partner-disconnected");
      socket.off("partner-reconnected");
      socket.off("session-ended");
      socket.off("session-reset");
      disconnectSocket();
    };
  }, [inviteCode, focusInput]);

  const handleSubmitWord = () => {
    const trimmed = wordInput.trim();
    if (!trimmed || !socketRef.current) return;

    socketRef.current.emit("submit-word", { word: trimmed });
    setWordInput("");

    // Brief feedback animation
    setShowFeedback(true);
    setTimeout(() => {
      setShowFeedback(false);
    }, 600);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && wordInput.trim()) {
      handleSubmitWord();
    }
  };

  // Revealed state — show shared RevealView
  if (status === "revealed" && revealData) {
    return (
      <RevealView
        title={revealData.title}
        story={revealData.story}
        filledWords={revealData.filledWords}
        resultText={revealData.resultText}
        resultId={revealData.resultId}
        inviteCode={inviteCode}
        isHost={false}
      />
    );
  }

  // Error state
  if (status === "error") {
    return (
      <PageShell>
        <Card>
          <h1 className="ui-heading ui-heading--small">{error || "Something went wrong"}</h1>
          <div style={{ display: "flex", gap: "var(--spacing-md)", justifyContent: "center", marginTop: "var(--spacing-lg)" }}>
            <Button onClick={() => navigate("/join")}>Join Another Game</Button>
            <Button
              onClick={() => navigate("/")}
              style={{
                backgroundColor: "transparent",
                color: "var(--text-primary)",
                border: "1px solid var(--border-color)",
              }}
            >
              Home
            </Button>
          </div>
        </Card>
      </PageShell>
    );
  }

  // Connecting state
  if (status === "connecting") {
    return (
      <PageShell>
        <Card>
          <div style={{ textAlign: "center", padding: "var(--spacing-xl)" }}>
            <div className="loader" style={{ margin: "0 auto" }}></div>
            <p className="ui-text ui-text--secondary" style={{ marginTop: "var(--spacing-md)" }}>
              Joining live game...
            </p>
          </div>
        </Card>
      </PageShell>
    );
  }

  // Waiting for reveal
  if (status === "waiting-reveal") {
    return (
      <PageShell>
        <Card>
          <div style={{ textAlign: "center", padding: "var(--spacing-xl)" }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                backgroundColor: "#d1fae5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto var(--spacing-lg)",
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1 className="ui-heading ui-heading--small">All done!</h1>
            <p className="ui-text ui-text--secondary" style={{ marginTop: "var(--spacing-sm)" }}>
              Waiting for the reveal...
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--spacing-sm)", marginTop: "var(--spacing-md)" }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: "var(--color-primary)",
                  animation: "pulse-dot 1.5s ease-in-out infinite",
                }}
              />
              <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                Your partner will reveal the story any moment...
              </span>
            </div>
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

  // Playing state — show word prompt
  return (
    <PageShell>
      <Card>
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
              marginBottom: "var(--spacing-md)",
            }}
          >
            Your partner disconnected — waiting for them to come back...
          </div>
        )}

        {/* Progress */}
        <div
          style={{
            fontSize: "14px",
            color: "var(--text-secondary)",
            textAlign: "center",
            marginBottom: "var(--spacing-lg)",
          }}
        >
          Word {currentGapIndex + 1} of {totalGaps}
        </div>

        {/* Feedback animation */}
        {showFeedback && (
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 100,
              animation: "feedback-fade 0.6s ease-out forwards",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                backgroundColor: "#d1fae5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>
        )}

        {/* Word prompt */}
        {currentGap && (
          <div style={{ textAlign: "center" }}>
            <h2
              className="ui-heading"
              style={{
                fontSize: "28px",
                marginBottom: "var(--spacing-lg)",
              }}
            >
              Give me {getArticle(currentGap.wordType)}{" "}
              <strong style={{ color: "var(--color-primary)" }}>
                {currentGap.wordType.toUpperCase()}
              </strong>
            </h2>
            {currentGap.hint && currentGap.hint !== currentGap.wordType && (
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--text-secondary)",
                  marginTop: "-8px",
                  marginBottom: "var(--spacing-md)",
                }}
              >
                ({currentGap.hint})
              </p>
            )}
          </div>
        )}

        <TextInput
          type="text"
          value={wordInput}
          onChange={(e) => setWordInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your word..."
          inputRef={inputRef}
          autoFocus
        />

        <div style={{ marginTop: "var(--spacing-lg)" }}>
          <Button onClick={handleSubmitWord} disabled={!wordInput.trim()} style={{ width: "100%" }}>
            Submit
          </Button>
        </div>
      </Card>

      <style>{`
        @keyframes feedback-fade {
          0% { opacity: 1; transform: translate(-50%, -50%) scale(0.5); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </PageShell>
  );
};

export default PartnerView;
