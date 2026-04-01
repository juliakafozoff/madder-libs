import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "../../axios";
import { setStory } from "../../store/actions/story";
import PageShell from "../../components/ui/PageShell";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import TextInput from "../../components/ui/TextInput";
import LogoutButton from "../../components/ui/LogoutButton";
import { autoLogout } from "../../store/actions/auth";

const JoinGame = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();

  const [gameCode, setGameCode] = useState("");
  const [error, setError] = useState(null);

  // Prefill game code from URL query params
  useEffect(() => {
    const gameParam = searchParams.get('game');
    if (gameParam) {
      setGameCode(gameParam);
    }
  }, [searchParams]);

  const handleLogout = async () => {
    await dispatch(autoLogout());
    navigate("/login");
  };

  const handleCodeChange = (e) => {
    let value = e.target.value;

    // If pasted value looks like a URL, extract the code immediately
    const urlMatch = value.match(/\/start\/([^\/?#]+)/);
    if (urlMatch) {
      value = urlMatch[1];
    }

    // Auto-uppercase and trim whitespace
    setGameCode(value.toUpperCase().trim());
    setError(null);
  };

  // Extract game code from input (handles both links and codes)
  const extractCodeFromInput = (input) => {
    const trimmed = input.trim();
    if (!trimmed) {
      return null;
    }

    // Check if input contains /start/ (invite link pattern)
    const startMatch = trimmed.match(/\/start\/([^\/?#]+)/);
    if (startMatch) {
      return startMatch[1];
    }

    // If it's just a code (no URL structure), use it as-is
    return trimmed;
  };

  const joinGame = async () => {
    const extractedCode = extractCodeFromInput(gameCode);
    if (!extractedCode) {
      return;
    }

    setError(null);
    const code = extractedCode;

    const token = localStorage.getItem("userToken");
    const headers = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.authorization = token;
    }

    try {
      const response = await axios.get(`/story/get/${code}`, {
        headers,
      });

      if (token) {
        await axios.put(
          `/story/play/${code}`,
          {},
          {
            headers: {
              authorization: token,
            },
          }
        );
      }

      dispatch(setStory(response.data.story));
      navigate(`/start/${code}`);
    } catch (err) {
      if (err.response?.status === 404) {
        setError("Game not found. Check your code and try again.");
      } else {
        setError(err.response?.data?.error || "Couldn't join game. Please try again.");
      }
    }
  };

  const handleBack = () => {
    // If browser history has previous pages, go back
    // Otherwise navigate to homepage
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const token = localStorage.getItem("userToken");

  return (
    <PageShell>
      {token && <LogoutButton onClick={handleLogout} />}
      <Card>
        <h1 className="ui-heading">Join a Game</h1>
        <TextInput
          type="text"
          placeholder="e.g. ABC123"
          label="Game Code"
          value={gameCode}
          onChange={handleCodeChange}
          required
          autoCapitalize="characters"
          style={{ textTransform: 'uppercase', letterSpacing: '2px', fontFamily: 'monospace' }}
        />
        {!gameCode ? (
          <p style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            marginTop: '-8px',
            marginBottom: '0'
          }}>
            Paste a link or enter a 6-character code
          </p>
        ) : gameCode.length > 0 && gameCode.length !== 6 && !gameCode.includes('/') ? (
          <p style={{
            fontSize: '13px',
            color: '#d97706',
            marginTop: '-8px',
            marginBottom: '0'
          }}>
            Codes are 6 characters ({gameCode.length}/6)
          </p>
        ) : null}
        <Button onClick={joinGame} disabled={!gameCode.trim()}>
          JOIN THE GAME
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
        <Button 
          variant="secondary" 
          onClick={handleBack}
          style={{
            backgroundColor: '#ffffff',
            borderColor: '#e5e7eb',
            color: '#6b7280',
            marginTop: 'var(--spacing-sm)'
          }}
        >
          ← Back
        </Button>
      </Card>
    </PageShell>
  );
};

export default JoinGame;
