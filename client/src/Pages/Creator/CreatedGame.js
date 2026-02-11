import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import copy from "clipboard-copy";
import { ClipboardCopyIcon } from "@heroicons/react/outline";
import { useSelector, useDispatch } from "react-redux";
import PageShell from "../../components/ui/PageShell";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import LogoutButton from "../../components/ui/LogoutButton";
import { autoLogout } from "../../store/actions/auth";
import axios from "../../axios";

const CreatedGame = () => {
  const story = useSelector((state) => state.storyData.story);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { id } = useParams(); // This is the templateId (UUID)
  const [inviteCode, setInviteCode] = useState(null);

  // Fetch story to get inviteCode from backend
  useEffect(() => {
    const fetchStory = async () => {
      if (!id) return;
      const token = localStorage.getItem("userToken");
      const headers = {
        "Content-Type": "application/json",
      };
      
      // Only include authorization header if token exists
      if (token) {
        headers.authorization = token;
      }
      
      try {
        const response = await axios.get(`/story/get/${id}`, {
          headers,
        });
        if (response.data.story && response.data.story.inviteCode) {
          setInviteCode(response.data.story.inviteCode);
        }
      } catch (error) {
        console.error("Error fetching story:", error);
      }
    };
    fetchStory();
  }, [id]);

  const copyInviteLink = () => {
    if (!inviteCode) return;
    const inviteLink = `${window.location.origin}/start/${inviteCode}`;
    copy(inviteLink);
    alert("Invite link has been copied!");
  };

  const handleLogout = async () => {
    await dispatch(autoLogout());
    navigate("/login");
  };

  const token = localStorage.getItem("userToken");

  return (
    <PageShell>
      {token && <LogoutButton onClick={handleLogout} />}
      <Card>
        <h1 className="ui-heading">{story?.title || "Your Story"}</h1>
        <p className="ui-text ui-text--secondary" style={{ textAlign: 'center' }}>
          Invite a friend to play
        </p>
        {inviteCode ? (
          <>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-md)',
              padding: 'var(--spacing-md)',
              backgroundColor: '#f9fafb',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  marginBottom: 'var(--spacing-xs)'
                }}>Invite Code:</div>
                <code style={{
                  fontFamily: 'monospace',
                  fontSize: '24px',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--text-primary)',
                  letterSpacing: '2px'
                }}>{inviteCode}</code>
              </div>
              <button
                onClick={copyInviteLink}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 'var(--spacing-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 'var(--radius-sm)',
                  transition: 'background-color var(--transition-fast)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                aria-label="Copy invite link"
              >
                <ClipboardCopyIcon className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
              </button>
            </div>
            <Button onClick={copyInviteLink}>
              Copy invite link
            </Button>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 'var(--spacing-md)' }}>
            <div className="loader" style={{ margin: '0 auto' }}></div>
            <p style={{ marginTop: 'var(--spacing-md)', color: 'var(--text-secondary)' }}>
              Loading invite code...
            </p>
          </div>
        )}
        <Button variant="tertiary" onClick={() => navigate("/home")}>
          Back to home
        </Button>
      </Card>
    </PageShell>
  );
};

export default CreatedGame;
