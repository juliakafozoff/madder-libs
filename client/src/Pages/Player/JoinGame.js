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
    setGameCode(e.target.value);
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
    
    const code = extractedCode;

    const token = localStorage.getItem("userToken");
    const headers = {
      "Content-Type": "application/json",
    };
    
    // Only include authorization header if token exists
    if (token) {
      headers.authorization = token;
    }
    
    const response = await axios.get(`/story/get/${code}`, {
      headers,
    });
    
    // Only call /play if authenticated (for tracking)
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
          placeholder="Enter game code"
          label="Game Code"
          value={gameCode}
          onChange={handleCodeChange}
          required
        />
        {!gameCode && (
          <p style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            marginTop: '-8px',
            marginBottom: '0'
          }}>
            Paste a link or enter a code
          </p>
        )}
        <Button onClick={joinGame} disabled={!gameCode.trim()}>
          JOIN THE GAME
        </Button>
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
