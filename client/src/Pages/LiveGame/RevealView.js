import React, { useState } from "react";
import copy from "clipboard-copy";
import { useNavigate } from "react-router-dom";
import axios from "../../axios";
import PageShell from "../../components/ui/PageShell";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import PresentationMode from "../../components/PresentationMode";
import StoryIllustration from "../../components/StoryIllustration";

const RevealView = ({ title, story, filledWords, resultText, resultId, inviteCode, isHost }) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPresentation, setShowPresentation] = useState(true);
  const [showIllustration, setShowIllustration] = useState(false);

  const renderStoryWithHighlights = () => {
    let gapIndex = 0;
    return story.map((piece, i) => {
      if (typeof piece === "object" && piece.class === "gap") {
        const word = filledWords[gapIndex];
        gapIndex++;
        return (
          <span
            key={i}
            className="filled-word"
            style={{ animation: "reveal-pop 0.4s ease-out" }}
          >
            {word || "[blank]"}
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

  const handleSave = async () => {
    if (!resultId || saved) return;
    setSaving(true);
    try {
      const token = localStorage.getItem("userToken");
      const headers = { "Content-Type": "application/json" };
      if (token) headers.authorization = token;

      await axios.post("/story/result", {
        resultId,
        templateId: story?.[0]?.storyId || "unknown",
        title: title || "Untitled Story",
        resultText,
      }, { headers });

      setSaved(true);
    } catch (err) {
      if (err.response?.status === 409) {
        setSaved(true);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/result/${resultId}`;
    if (navigator.share) {
      try {
        const teaser = resultText.length > 100 ? resultText.slice(0, 100) + "\u2026" : resultText;
        await navigator.share({
          title: `"${title}" — Glad Libs`,
          text: teaser,
          url,
        });
      } catch (err) {
        if (err.name !== "AbortError") {
          copy(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      }
    } else {
      copy(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyText = () => {
    copy(resultText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePlayAgain = () => {
    if (isHost && inviteCode) {
      navigate(`/live/host/${inviteCode}`);
      window.location.reload();
    } else {
      navigate("/");
    }
  };

  if (showPresentation) {
    return (
      <PresentationMode
        title={title}
        resultText={resultText}
        filledWords={filledWords}
        onComplete={() => {
          setShowPresentation(false);
          setShowIllustration(true);
        }}
        onClose={() => setShowPresentation(false)}
      />
    );
  }

  return (
    <PageShell>
      <Card wide>
        <h1
          className="ui-heading"
          style={{
            backgroundColor: "#1f2937",
            color: "#ffffff",
            padding: "var(--spacing-md)",
            borderRadius: "var(--radius-md)",
            marginBottom: "var(--spacing-lg)",
          }}
        >
          {title}
        </h1>

        <div
          style={{
            fontSize: "18px",
            lineHeight: "1.8",
            color: "var(--text-primary)",
            padding: "var(--spacing-lg)",
            minHeight: "100px",
          }}
        >
          {story && filledWords ? renderStoryWithHighlights() : resultText}
        </div>

        {(showIllustration || !showPresentation) && resultId && (
          <StoryIllustration resultId={resultId} title={title} />
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "var(--spacing-md)",
            flexWrap: "wrap",
            marginTop: "var(--spacing-lg)",
          }}
        >
          {resultId && (
            <Button onClick={handleShare} style={{ maxWidth: "160px" }}>
              {copied ? "Copied!" : "Share Result"}
            </Button>
          )}
          <Button
            onClick={handleCopyText}
            style={{
              maxWidth: "160px",
              backgroundColor: "transparent",
              color: "var(--text-primary)",
              border: "1px solid var(--border-color)",
            }}
          >
            Copy story
          </Button>
          {isHost && inviteCode && (
            <Button onClick={handlePlayAgain} style={{ maxWidth: "160px" }}>
              Play Again
            </Button>
          )}
          <Button
            onClick={() => navigate("/")}
            style={{
              maxWidth: "160px",
              backgroundColor: "transparent",
              color: "var(--text-primary)",
              border: "1px solid var(--border-color)",
            }}
          >
            Home
          </Button>
        </div>
      </Card>

      <style>{`
        @keyframes reveal-pop {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </PageShell>
  );
};

export default RevealView;
