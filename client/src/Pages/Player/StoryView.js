import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import copy from "clipboard-copy";
import axios from "../../axios";
import { shareOrCopy } from "../../utils/share";
import PageShell from "../../components/ui/PageShell";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import LogoutButton from "../../components/ui/LogoutButton";
import PresentationMode from "../../components/PresentationMode";
import StoryIllustration from "../../components/StoryIllustration";
import { useDispatch } from "react-redux";
import { autoLogout } from "../../store/actions/auth";

const StoryView = () => {
  const { resultId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [story, setStory] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [libraryInfo, setLibraryInfo] = useState(null);
  const [showPresentation, setShowPresentation] = useState(false);

  useEffect(() => {
    // Load the specific story from localStorage
    const savedStories = JSON.parse(
      localStorage.getItem("completedStories") || "[]"
    );
    const foundStory = savedStories.find((s) => s.resultId === resultId);
    
    if (foundStory) {
      setStory(foundStory);
      // Try to fetch library attribution
      if (foundStory.templateId) {
        axios.get(`/story/get/${foundStory.templateId}`)
          .then((res) => {
            if (res.data.story?.premadeTextId) {
              return axios.get(`/library/texts/${res.data.story.premadeTextId}`);
            }
          })
          .then((res) => {
            if (res?.data?.success) setLibraryInfo(res.data.text);
          })
          .catch(() => {});
      }
    } else {
      // Story not found, redirect to oldstories
      navigate("/oldstories");
    }
  }, [resultId, navigate]);

  const handleLogout = async () => {
    await dispatch(autoLogout());
    navigate("/login");
  };

  if (!story) {
    return (
      <PageShell>
        <LogoutButton onClick={handleLogout} />
        <Card>
          <div className="loader" style={{ margin: '0 auto' }}></div>
        </Card>
      </PageShell>
    );
  }

  // Format date
  const date = new Date(story.createdAt);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <PageShell>
      {showPresentation && (
        <PresentationMode
          title={story.title || "Untitled"}
          resultText={story.resultText}
          filledWords={[]}
          onComplete={() => setShowPresentation(false)}
          onClose={() => setShowPresentation(false)}
        />
      )}
      <LogoutButton onClick={handleLogout} />
      <Card>
        <h1 className="ui-heading" style={{
          backgroundColor: '#1f2937',
          color: '#ffffff',
          padding: 'var(--spacing-md)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--spacing-lg)'
        }}>
          {story.title || "Untitled story"}
        </h1>
        {libraryInfo && (
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', marginTop: '-8px', marginBottom: 'var(--spacing-sm)' }}>
            Based on {libraryInfo.title} by {libraryInfo.author}{libraryInfo.year ? ` (${libraryInfo.year})` : ''}
          </p>
        )}
        <p style={{
          fontSize: '14px',
          color: 'var(--text-secondary)',
          marginBottom: 'var(--spacing-lg)',
          textAlign: 'center'
        }}>
          {formattedDate}
        </p>
        <div style={{
          fontSize: '18px',
          lineHeight: '1.8',
          color: 'var(--text-primary)',
          padding: 'var(--spacing-lg)',
          minHeight: '100px',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word'
        }}>
          {story.resultText}
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 'var(--spacing-md)',
          marginTop: 'var(--spacing-md)'
        }}>
          <Button
            onClick={async () => {
              const url = `${window.location.origin}/result/${resultId}`;
              const teaser = story.resultText && story.resultText.length > 100
                ? story.resultText.slice(0, 100) + "…"
                : (story.resultText || "Check out this Glad Libs story!");
              const { method } = await shareOrCopy({
                title: `"${story.title}" — Glad Libs`,
                text: teaser,
                url,
              });
              if (method === "copied") {
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
              copy(`${window.location.origin}/result/${resultId}`);
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
              copy(story.resultText || "");
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
        {libraryInfo && (
          <div style={{ textAlign: 'center', marginTop: 'var(--spacing-md)' }}>
            <button
              onClick={() => navigate(`/library/${libraryInfo.textId}/edit`)}
              style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '15px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}
              onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
              onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
            >
              Make your own version →
            </button>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--spacing-md)' }}>
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
        <StoryIllustration resultId={resultId} title={story.title} />
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 'var(--spacing-md)',
          marginTop: 'var(--spacing-lg)'
        }}>
          <Button variant="tertiary" onClick={() => navigate("/oldstories")} style={{ width: 'auto', display: 'inline-block' }}>
            Back
          </Button>
          <Button onClick={() => navigate(`/start/${story.templateId}`)}>
            Play again
          </Button>
        </div>
      </Card>
    </PageShell>
  );
};

export default StoryView;

