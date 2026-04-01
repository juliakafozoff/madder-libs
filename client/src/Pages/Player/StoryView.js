import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import copy from "clipboard-copy";
import PageShell from "../../components/ui/PageShell";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import LogoutButton from "../../components/ui/LogoutButton";
import { useDispatch } from "react-redux";
import { autoLogout } from "../../store/actions/auth";

const StoryView = () => {
  const { resultId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [story, setStory] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Load the specific story from localStorage
    const savedStories = JSON.parse(
      localStorage.getItem("completedStories") || "[]"
    );
    const foundStory = savedStories.find((s) => s.resultId === resultId);
    
    if (foundStory) {
      setStory(foundStory);
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
              if (navigator.share) {
                try {
                  await navigator.share({
                    title: `"${story.title}" — Glad Libs`,
                    text: 'Check out this Glad Libs story!',
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
        </div>
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

