import React, { useState, useEffect, useCallback } from "react";

const PresentationMode = ({ title, resultText, filledWords = [], onComplete, onClose }) => {
  const [sentences, setSentences] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1); // -1 = title phase
  const [showHint, setShowHint] = useState(true);
  const [titleVisible, setTitleVisible] = useState(false);

  useEffect(() => {
    const split = resultText
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim().length > 0);
    setSentences(split);
    setTimeout(() => setTitleVisible(true), 100);
    setTimeout(() => setCurrentIndex(0), 2000);
  }, [resultText]);

  const advance = useCallback(() => {
    if (currentIndex < 0) return;
    if (showHint) setShowHint(false);
    if (currentIndex < sentences.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setTimeout(() => onComplete?.(), 1000);
    }
  }, [currentIndex, sentences.length, showHint, onComplete]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") {
        onClose?.();
        return;
      }
      advance();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [advance, onClose]);

  const highlightWords = (text) => {
    if (!filledWords || filledWords.length === 0) return text;
    const lowerWords = filledWords
      .filter(Boolean)
      .map((w) => (typeof w === "object" && w.result ? w.result : w))
      .filter((w) => typeof w === "string" && w.trim().length > 0);
    if (lowerWords.length === 0) return text;

    const escaped = lowerWords.map((w) =>
      w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    );
    const regex = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");
    const parts = text.split(regex);

    return parts.map((part, i) => {
      const isMatch = lowerWords.some(
        (w) => w.toLowerCase() === part.toLowerCase()
      );
      if (isMatch) {
        return (
          <span key={i} style={{ fontWeight: 700, color: "#60a5fa" }}>
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div
      onClick={advance}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "#111827",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        overflow: "auto",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose?.();
        }}
        style={{
          position: "fixed",
          top: 20,
          right: 24,
          background: "none",
          border: "1px solid rgba(255,255,255,0.2)",
          color: "rgba(255,255,255,0.5)",
          fontSize: "14px",
          padding: "6px 16px",
          borderRadius: "6px",
          cursor: "pointer",
          zIndex: 10000,
        }}
      >
        Skip
      </button>

      <div style={{ maxWidth: 700, width: "100%" }}>
        <h1
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: "clamp(28px, 5vw, 42px)",
            fontWeight: 700,
            color: "#ffffff",
            textAlign: "center",
            marginBottom: "48px",
            opacity: titleVisible ? 1 : 0,
            transform: titleVisible ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.8s ease, transform 0.8s ease",
          }}
        >
          {title}
        </h1>

        <div>
          {sentences.slice(0, currentIndex + 1).map((sentence, i) => (
            <p
              key={i}
              style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: "clamp(18px, 3vw, 24px)",
                lineHeight: 1.8,
                color: "#e5e7eb",
                textAlign: "center",
                marginBottom: "24px",
                animation: "pres-fade-in 0.6s ease-out both",
              }}
            >
              {highlightWords(sentence)}
            </p>
          ))}
        </div>

        {showHint && currentIndex >= 0 && (
          <p
            style={{
              textAlign: "center",
              color: "rgba(255,255,255,0.35)",
              fontSize: "14px",
              marginTop: "40px",
              animation: "pres-fade-in 0.6s ease-out both",
            }}
          >
            Tap to continue
          </p>
        )}
      </div>

      <style>{`
        @keyframes pres-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default PresentationMode;
