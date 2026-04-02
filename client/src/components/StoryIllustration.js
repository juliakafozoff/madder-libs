import React, { useState, useEffect } from "react";
import axios from "../axios";

const StoryIllustration = ({ resultId, title }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!resultId) {
      setLoading(false);
      setHidden(true);
      return;
    }

    const fetchIllustration = async () => {
      try {
        const token = localStorage.getItem("userToken");
        const headers = { "Content-Type": "application/json" };
        if (token) headers.authorization = token;

        const res = await axios.post(
          `/story/result/${resultId}/illustration`,
          {},
          { headers }
        );
        if (res.data.illustrationUrl) {
          setImageUrl(res.data.illustrationUrl);
        } else {
          setHidden(true);
        }
      } catch (err) {
        setHidden(true);
      } finally {
        setLoading(false);
      }
    };

    fetchIllustration();
  }, [resultId]);

  if (hidden) return null;

  if (loading) {
    return (
      <div
        style={{
          marginTop: "var(--spacing-lg)",
          padding: "var(--spacing-xl)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-color)",
          backgroundColor: "rgba(255,255,255,0.05)",
          textAlign: "center",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div className="illustration-shimmer" />
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "15px",
            position: "relative",
            zIndex: 1,
          }}
        >
          Creating your illustration...
        </p>
        <style>{`
          .illustration-shimmer {
            position: absolute;
            inset: 0;
            background: linear-gradient(
              90deg,
              transparent 0%,
              rgba(96, 165, 250, 0.08) 50%,
              transparent 100%
            );
            animation: shimmer-move 1.5s ease-in-out infinite;
          }
          @keyframes shimmer-move {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: "var(--spacing-lg)",
        textAlign: "center",
        animation: "illus-reveal 0.5s ease-out both",
      }}
    >
      <img
        src={imageUrl}
        alt="AI-generated illustration of the story"
        style={{
          maxWidth: "100%",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-color)",
        }}
      />
      <button
        onClick={async () => {
          const shareUrl = `${window.location.origin}/result/${resultId}`;
          const shareText = title
            ? `See what happened when we played Glad Libs with "${title}"...`
            : "Check out this Glad Libs illustration!";
          if (navigator.share) {
            try {
              await navigator.share({ title: "Glad Libs Illustration", text: shareText, url: shareUrl });
            } catch (err) {
              if (err.name !== "AbortError") {
                try { await navigator.clipboard.writeText(shareUrl); } catch {}
              }
            }
          } else {
            try { await navigator.clipboard.writeText(shareUrl); } catch {}
          }
        }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          marginTop: "var(--spacing-sm)",
          padding: "6px 16px",
          fontSize: "14px",
          color: "var(--text-secondary)",
          background: "none",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-sm)",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
        Share illustration
      </button>
      <style>{`
        @keyframes illus-reveal {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default StoryIllustration;
