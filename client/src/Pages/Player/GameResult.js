import React, { useEffect, useState } from "react";
import storyResultData from "./storyResultData";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { v4 as uuidv4 } from "uuid";
import copy from "clipboard-copy";
import axios from "../../axios";
import PageShell from "../../components/ui/PageShell";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import PresentationMode from "../../components/PresentationMode";
import StoryIllustration from "../../components/StoryIllustration";

const GameResult = () => {
  const storyData = useSelector((state) => state.storyData);
  const navigate = useNavigate();
  const [savedToBackend, setSavedToBackend] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [currentResultId, setCurrentResultId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [libraryInfo, setLibraryInfo] = useState(null);
  const [showPresentation, setShowPresentation] = useState(false);
  const [showIllustration, setShowIllustration] = useState(false);

  // Save completed story to backend and localStorage
  useEffect(() => {
    if (storyData.story && storyData.resultStory && storyData.resultStory.length > 0 && !savedToBackend) {
      const saveResult = async () => {
        try {
          // Convert resultStory array to text string
          const resultText = storyData.resultStory
            .map((word) => {
              if (typeof word === "object" && word.result) {
                return word.result;
              }
              return word;
            })
            .join(" ")
            .trim();

          // Get templateId - try storyId first, then _id, then use a fallback
          const templateId = storyData.story.storyId || storyData.story._id || "unknown";

          const resultId = uuidv4();
          setCurrentResultId(resultId);
          const completedStory = {
            resultId,
            templateId,
            title: storyData.story.title || "Untitled story",
            resultText,
            createdAt: new Date().toISOString(),
          };

          // Try to save to backend first
          try {
            const token = localStorage.getItem("userToken");
            const headers = {
              "Content-Type": "application/json",
            };
            if (token) {
              headers.authorization = token;
            }

            const response = await axios.post("/story/result", completedStory, { headers });
            
            if (response.data.success) {
              setSavedToBackend(true);
            }
          } catch (backendError) {
            setSaveError(true);
          }

          // Also save to localStorage (for offline support and backward compatibility)
          const existingStories = JSON.parse(
            localStorage.getItem("completedStories") || "[]"
          );

          // Check if this story already exists (avoid duplicates)
          const alreadyExists = existingStories.some(
            (s) => s.templateId === templateId && s.resultText === resultText
          );

          if (!alreadyExists) {
            // Add new story at the beginning (newest first)
            const updatedStories = [completedStory, ...existingStories];

            // Save back to localStorage
            localStorage.setItem("completedStories", JSON.stringify(updatedStories));
          }
        } catch (error) {
          console.error("Failed to save completed story:", error);
          setSaveError(true);
        }
      };

      saveResult();
    }
  }, [storyData.story, storyData.resultStory, savedToBackend]);

  // Fetch library attribution if premadeTextId exists
  useEffect(() => {
    if (storyData.story?.premadeTextId) {
      axios.get(`/library/texts/${storyData.story.premadeTextId}`)
        .then((res) => {
          if (res.data.success) setLibraryInfo(res.data.text);
        })
        .catch(() => {});
    }
  }, [storyData.story?.premadeTextId]);

  // Navigate away if data is missing
  useEffect(() => {
    if (!storyData.story || !storyData.resultStory || storyData.resultStory.length === 0) {
      navigate("/home");
    }
  }, [storyData.story, storyData.resultStory, navigate]);

  // Show loading or nothing while checking data
  if (!storyData.story || !storyData.resultStory || storyData.resultStory.length === 0) {
    return null;
  }

  const resultText = storyData.resultStory
    .map((w) => (typeof w === "object" && w.result ? w.result : w))
    .join(" ")
    .trim();

  const filledWords = storyData.resultStory
    .filter((w) => typeof w === "object" && w.result)
    .map((w) => w.result);

  return (
    <PageShell>
      {showPresentation && (
        <PresentationMode
          title={storyData.story?.title || "Untitled"}
          resultText={resultText}
          filledWords={filledWords}
          onComplete={() => {
            setShowPresentation(false);
            setShowIllustration(true);
          }}
          onClose={() => setShowPresentation(false)}
        />
      )}
      <Card>
        <h1 className="ui-heading" style={{
          backgroundColor: '#1f2937',
          color: '#ffffff',
          padding: 'var(--spacing-md)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--spacing-lg)'
        }}>
          {storyData?.story?.title}
        </h1>
        {libraryInfo && (
          <p style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            fontStyle: 'italic',
            textAlign: 'center',
            marginTop: '-8px',
            marginBottom: 'var(--spacing-md)',
          }}>
            Based on {libraryInfo.title} by {libraryInfo.author}{libraryInfo.year ? ` (${libraryInfo.year})` : ''}
          </p>
        )}
        <div style={{
          fontSize: '18px',
          lineHeight: '1.8',
          color: 'var(--text-primary)',
          padding: 'var(--spacing-lg)',
          minHeight: '100px'
        }}>
          {storyData.resultStory.map((word, index) => {
            if (typeof word === "object") {
              return (
                <span key={index} className="filled-word">
                  {word.result}{" "}
                </span>
              );
            }
            return <span key={index}> {word} </span>;
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--spacing-lg)' }}>
          <Button
            onClick={() => setShowPresentation(true)}
            style={{
              maxWidth: '200px',
              backgroundColor: 'transparent',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Present Story
          </Button>
        </div>

        <h3 className="ui-heading ui-heading--small" style={{ marginTop: 'var(--spacing-lg)' }}>
          The End!
        </h3>
        {saveError && (
          <p style={{ color: 'var(--color-error, #ef4444)', fontSize: '14px', marginTop: 'var(--spacing-md)' }}>
            Something went wrong saving your story. Try playing again!
          </p>
        )}
        {currentResultId && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-md)' }}>
            <Button
              onClick={async () => {
                const url = `${window.location.origin}/result/${currentResultId}`;
                if (navigator.share) {
                  try {
                    const resultText = storyData.resultStory
                      .map((w) => (typeof w === "object" && w.result ? w.result : w))
                      .join(" ")
                      .trim();
                    const teaser = resultText.length > 100 ? resultText.slice(0, 100) + "…" : resultText;
                    await navigator.share({
                      title: `"${storyData.story?.title}" — Glad Libs`,
                      text: teaser,
                      url,
                    });
                  } catch (err) {
                    if (err.name !== 'AbortError') {
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
              }}
              style={{ maxWidth: '160px' }}
            >
              Share story
            </Button>
            <Button
              onClick={() => {
                copy(`${window.location.origin}/result/${currentResultId}`);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              style={{
                maxWidth: '160px',
                backgroundColor: 'transparent',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)'
              }}
            >
              {copied ? 'Copied!' : 'Copy link'}
            </Button>
            <Button
              onClick={() => {
                const text = storyData.resultStory
                  .map((w) => (typeof w === "object" && w.result ? w.result : w))
                  .join(" ")
                  .trim();
                copy(text);
                setCopiedText(true);
                setTimeout(() => setCopiedText(false), 2000);
              }}
              style={{
                maxWidth: '160px',
                backgroundColor: 'transparent',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)'
              }}
            >
              {copiedText ? 'Copied!' : 'Copy story'}
            </Button>
          </div>
        )}
        {libraryInfo && (
          <div style={{ textAlign: 'center', marginTop: 'var(--spacing-md)' }}>
            <button
              onClick={() => navigate(`/library/${libraryInfo.textId}/edit`)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-primary)',
                fontSize: '15px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: 500,
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
              onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
            >
              Make your own version →
            </button>
          </div>
        )}
        {(showIllustration || !showPresentation) && currentResultId && (
          <StoryIllustration resultId={currentResultId} title={storyData.story?.title} />
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--spacing-lg)' }}>
          <Button onClick={() => navigate("/home")} style={{ maxWidth: '200px' }}>
            Go to Home
          </Button>
        </div>
      </Card>
    </PageShell>
  );
};

export default GameResult;
