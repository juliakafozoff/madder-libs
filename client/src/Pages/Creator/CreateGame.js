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
import { useDispatch } from "react-redux";
import { autoLogout } from "../../store/actions/auth";

const CreateGame = () => {
  const [gameId, setGameId] = useState(uuidv4());
  const [inviteCode, setInviteCode] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const abortControllerRef = useRef(null);

  const copyInviteLink = () => {
    if (!inviteCode) return;
    const inviteLink = `${window.location.origin}/start/${inviteCode}`;
    copy(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
    
    console.log("createGame: start", { gameId });
    
    const token = localStorage.getItem("userToken");
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    let timeoutId = null;
    
    try {
      timeoutId = setTimeout(() => {
        console.log("createGame: timeout after 10s");
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
      
      console.log("createGame: success", {
        status: response.status,
        data: response.data,
        story: response.data?.story,
        inviteCode: response.data?.story?.inviteCode,
        storyKeys: response.data?.story ? Object.keys(response.data.story) : null,
        fullResponse: JSON.stringify(response.data, null, 2),
      });
      
      // Check if there's an error message instead of story
      if (response.data.msg) {
        console.error("createGame: server returned error message:", response.data.msg);
        setError(`Couldn't create game: ${response.data.msg}. Please try again.`);
        return;
      }
      
      // Get inviteCode from response
      if (response.data.story) {
        const story = response.data.story;
        if (story.inviteCode) {
          setInviteCode(story.inviteCode);
        } else {
          console.warn("createGame: story exists but no inviteCode, fetching again", {
            storyId: story.storyId,
            storyKeys: Object.keys(story),
            story: story
          });
          // Fallback: fetch the story again to get inviteCode
          try {
            console.log("createGame: attempting to fetch story with storyId:", story.storyId);
            const fetchResponse = await axios.get(`/story/get/${story.storyId}`, {
        headers: {
          "Content-Type": "application/json",
          authorization: token,
        },
            });
            console.log("createGame: fetch response:", {
              hasStory: !!fetchResponse.data.story,
              inviteCode: fetchResponse.data.story?.inviteCode,
              storyKeys: fetchResponse.data.story ? Object.keys(fetchResponse.data.story) : null,
              fullResponse: JSON.stringify(fetchResponse.data, null, 2)
            });
            if (fetchResponse.data.story?.inviteCode) {
              console.log("createGame: fetched inviteCode successfully", fetchResponse.data.story.inviteCode);
              setInviteCode(fetchResponse.data.story.inviteCode);
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
        console.warn("createGame: no story in response", response.data);
        setError("Game created but response format unexpected. Please try again.");
      }
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      
      const errorDetails = {
        message: error.message,
        name: error.name,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        responseData: error.response?.data,
        isTimeout: error.name === 'AbortError' || error.code === 'ECONNABORTED',
      };
      
      console.error("createGame: error", errorDetails);
      
      if (error.name === 'AbortError' || error.code === 'ECONNABORTED' || errorDetails.isTimeout) {
        setError("Request timed out. Try again.");
      } else if (error.response) {
        // Server responded with error status
        const errorMsg = error.response.data?.msg || error.response.data?.message || `Server error (${error.response.status})`;
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
      console.log("createGame: finally - loading cleared");
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
        </div>
            <Button onClick={continueToBuilder}>
              Continue to story
        </Button>
          </>
        )}
      </Card>
    </PageShell>
  );
};

export default CreateGame;
