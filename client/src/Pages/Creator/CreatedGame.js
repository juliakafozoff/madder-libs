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
import { useToast } from "../../components/ui/Toast";
import { QRCodeSVG } from "qrcode.react";

const CreatedGame = () => {
  const story = useSelector((state) => state.storyData.story);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const toast = useToast();

  const { id } = useParams(); // This is the templateId (UUID)
  const [inviteCode, setInviteCode] = useState(null);
  const [error, setError] = useState(null);

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
      } catch (err) {
        console.error("Error fetching story:", err);
        setError("Failed to load the game. Please check your connection and try again.");
      }
    };
    fetchStory();
  }, [id]);

  const getInviteLink = () => `${window.location.origin}/start/${inviteCode}`;

  const copyInviteLink = () => {
    if (!inviteCode) return;
    copy(getInviteLink());
    toast.success("Invite link copied!");
  };

  const shareInviteLink = async () => {
    if (!inviteCode) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Play my Glad Libs story!',
          text: `Come play "${story?.title || 'my story'}" on Glad Libs!`,
          url: getInviteLink(),
        });
      } catch (err) {
        if (err.name !== 'AbortError') copyInviteLink();
      }
    } else {
      copyInviteLink();
    }
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
        {error ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <p className="text-base text-gray-700 text-center">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
            >
              Try again
            </button>
          </div>
        ) : inviteCode ? (
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
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
                <button
                  onClick={shareInviteLink}
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
                  aria-label="Share invite link"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-primary)', width: '24px', height: '24px' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </button>
              </div>
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginTop: 'var(--spacing-md)',
              marginBottom: 'var(--spacing-md)'
            }}>
              <QRCodeSVG
                value={getInviteLink()}
                size={200}
                level="M"
                style={{ borderRadius: 'var(--radius-sm)' }}
              />
              <span style={{
                fontSize: '13px',
                color: 'var(--text-secondary)',
                marginTop: 'var(--spacing-sm)'
              }}>
                Scan to play
              </span>
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
