import React, { useState, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import copy from "clipboard-copy";
import { ClipboardCopyIcon } from "@heroicons/react/outline";
import { useNavigate } from "react-router-dom";
import axios from "../../axios";
import PageShell from "../../components/ui/PageShell";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import LogoutButton from "../../components/ui/LogoutButton";
import RotatingLogo from "../../components/RotatingLogo";
import { advanceLogoIndex } from "../../utils/logoRotation";
import { QRCodeSVG } from "qrcode.react";
import { useDispatch } from "react-redux";
import { autoLogout } from "../../store/actions/auth";

const CreateGame = () => {
  const [gameId, setGameId] = useState(uuidv4());
  const [inviteCode, setInviteCode] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const abortControllerRef = useRef(null);

  const getInviteLink = () => `${window.location.origin}/start/${inviteCode}`;

  const copyInviteLink = () => {
    if (!inviteCode) return;
    copy(getInviteLink());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareInviteLink = async () => {
    if (!inviteCode) return;
    const shareData = {
      title: 'Play my Glad Libs story!',
      text: 'Come play my Glad Libs story!',
      url: getInviteLink(),
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } catch (err) {
        // User cancelled or share failed — fall back to copy
        if (err.name !== 'AbortError') {
          copyInviteLink();
        }
      }
    } else {
      copyInviteLink();
    }
  };

  const handleLogout = async () => {
    await dispatch(autoLogout());
    navigate("/login");
  };

  const createGame = async () => {
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setIsCreating(true);
    setError(null);
    
    const token = localStorage.getItem("userToken");
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    let timeoutId = null;
    
    try {
      timeoutId = setTimeout(() => {
        abortController.abort();
      }, 10000);

      const headers = {
        "Content-Type": "application/json",
      };
      
      // Only include authorization header if token exists
      if (token) {
        headers.authorization = token;
      }

      const response = await axios.post(
      "/story/create",
      {
        id: gameId,
      },
      {
          headers,
          signal: abortController.signal,
        }
      );
      
      if (timeoutId) clearTimeout(timeoutId);
      
      // Check if there's an error message instead of story
      if (response.data.error) {
        console.error("createGame: server returned error message:", response.data.error);
        setError(`Couldn't create game: ${response.data.error}. Please try again.`);
        return;
      }
      
      // Get inviteCode from response
      if (response.data.story) {
        const story = response.data.story;
        if (story.inviteCode) {
          setInviteCode(story.inviteCode);
          // Advance logo when invite code is successfully created
          advanceLogoIndex();
        } else {
          // Fallback: fetch the story again to get inviteCode
          try {
            const fetchResponse = await axios.get(`/story/get/${story.storyId}`, {
        headers: {
          "Content-Type": "application/json",
          authorization: token,
        },
            });
            if (fetchResponse.data.story?.inviteCode) {
              setInviteCode(fetchResponse.data.story.inviteCode);
              // Advance logo when invite code is successfully fetched
              advanceLogoIndex();
            } else {
              console.error("createGame: fetched story but still no inviteCode");
              setError("Game created but invite code not found. The server may need to be restarted. Please try again.");
            }
          } catch (fetchError) {
            console.error("createGame: failed to fetch inviteCode", {
              message: fetchError.message,
              response: fetchError.response?.data,
              status: fetchError.response?.status
            });
            setError("Game created but invite code not found. Please try again.");
          }
        }
      } else {
        setError("Game created but response format unexpected. Please try again.");
      }
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      
      if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
        setError("Request timed out. Try again.");
      } else if (error.response) {
        // Server responded with error status
        const errorMsg = error.response.data?.error || error.response.data?.message || `Server error (${error.response.status})`;
        setError(`Couldn't create game: ${errorMsg}. Please try again.`);
      } else if (error.request) {
        // Request made but no response
        setError("Couldn't reach server. Please check your connection and try again.");
      } else {
        // Something else happened
        setError("Couldn't create game. Please try again.");
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      abortControllerRef.current = null;
      setIsCreating(false);
    }
  };

  const continueToBuilder = () => {
    navigate(`/game-creator/${gameId}`);
  };

  const handleBack = () => {
    // If browser history has previous pages, go back
    // Otherwise navigate to home or welcome
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      const token = localStorage.getItem("userToken");
      navigate(token ? '/home' : '/');
    }
  };

  const token = localStorage.getItem("userToken");

  return (
    <PageShell>
      {token && <LogoutButton onClick={handleLogout} />}
      <Card style={{ position: 'relative' }}>
        <button
          onClick={handleBack}
          style={{
            position: 'absolute',
            top: 'var(--spacing-md)',
            left: 'var(--spacing-md)',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '13px',
            cursor: 'pointer',
            textDecoration: 'none',
            padding: '4px 0',
            fontFamily: 'inherit',
            fontWeight: 400,
            transition: 'color 0.2s ease',
            zIndex: 1
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-primary)';
            e.currentTarget.style.textDecoration = 'underline';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.textDecoration = 'none';
          }}
        >
          ← Back
        </button>
        <RotatingLogo 
          maxWidth="320px"
          marginBottom="20px"
          alt="Glad Libs"
        />
        <h1 className="ui-heading ui-heading--small" style={{ marginTop: 0 }}>Create a Game</h1>
        {!inviteCode ? (
          <>
            <p className="ui-text ui-text--secondary" style={{ 
              textAlign: 'center',
              fontSize: '14px',
              color: '#4b5563',
              marginTop: 'var(--spacing-sm)',
              marginBottom: 'var(--spacing-lg)'
            }}>
              Click below to create your game and get an invite code
            </p>
            <Button onClick={createGame} disabled={isCreating}>
              {isCreating ? "Creating..." : "Create my game"}
            </Button>
            {error && (
              <div style={{
                marginTop: 'var(--spacing-md)',
                padding: 'var(--spacing-md)',
                backgroundColor: '#fee2e2',
                border: '1px solid #fecaca',
                borderRadius: 'var(--radius-md)',
                color: '#991b1b',
                fontSize: '14px',
                textAlign: 'center'
              }}>
                {error}
              </div>
            )}
          </>
        ) : (
          <>
        <p className="ui-text ui-text--secondary" style={{ 
          textAlign: 'center',
          fontSize: '14px',
          color: '#4b5563',
          marginTop: 'var(--spacing-sm)',
          marginBottom: 'var(--spacing-md)'
        }}>
              Invite a friend to play
        </p>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-md)',
          padding: 'var(--spacing-md)',
          backgroundColor: '#f9fafb',
          borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              position: 'relative'
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
                <div style={{ position: 'relative' }}>
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
                  {copied && (
                    <div style={{
                      position: 'absolute',
                      top: '-32px',
                      right: '0',
                      backgroundColor: 'var(--text-primary)',
                      color: 'var(--text-white)',
                      padding: 'var(--spacing-xs) var(--spacing-sm)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                      fontWeight: 'var(--font-weight-medium)',
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                      zIndex: 10
                    }}>
                      Copied!
                    </div>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
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
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-primary)', width: '24px', height: '24px' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </button>
                  {shared && (
                    <div style={{
                      position: 'absolute',
                      top: '-32px',
                      right: '0',
                      backgroundColor: 'var(--text-primary)',
                      color: 'var(--text-white)',
                      padding: 'var(--spacing-xs) var(--spacing-sm)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                      fontWeight: 'var(--font-weight-medium)',
                      whiteSpace: 'nowrap',
                      pointerEvents: 'none',
                      zIndex: 10
                    }}>
                      Shared!
                    </div>
                  )}
                </div>
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
            <Button onClick={continueToBuilder}>
              Continue to story
        </Button>
            <Button
              variant="secondary"
              onClick={() => navigate(`/live/host/${inviteCode}`)}
              style={{ marginTop: 'var(--spacing-sm)' }}
            >
              Play Live with a Partner
            </Button>
          </>
        )}
      </Card>
    </PageShell>
  );
};

export default CreateGame;
