import React, { useRef } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
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

  const gameIdRef = useRef("");

  const handleLogout = async () => {
    await dispatch(autoLogout());
    navigate("/login");
  };

  const joinGame = async () => {
    const token = localStorage.getItem("userToken");
    const headers = {
      "Content-Type": "application/json",
    };
    
    // Only include authorization header if token exists
    if (token) {
      headers.authorization = token;
    }
    
    const response = await axios.get(`/story/get/${gameIdRef.current.value}`, {
      headers,
    });
    
    // Only call /play if authenticated (for tracking)
    if (token) {
      await axios.put(
        `/story/play/${gameIdRef.current.value}`,
        {},
        {
          headers: {
            authorization: token,
          },
        }
      );
    }
    
    dispatch(setStory(response.data.story));
    navigate(`/start/${gameIdRef.current.value}`);
  };

  const token = localStorage.getItem("userToken");

  return (
    <PageShell>
      {token && <LogoutButton onClick={handleLogout} />}
      <Card>
        <h1 className="ui-heading">Join a Game</h1>
        <TextInput
          inputRef={gameIdRef}
          type="text"
          placeholder="Enter game code"
          label="Game Code"
          required
        />
        <Button onClick={joinGame}>
          Join the game
        </Button>
      </Card>
    </PageShell>
  );
};

export default JoinGame;
