import React, { useEffect, useState, useRef } from "react";
import { ArrowNarrowRightIcon } from "@heroicons/react/outline";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import axios from "../../axios";
import { setStory } from "../../store/actions/story";
import { getSocket, disconnectSocket } from "../../services/socket";
import PageShell from "../../components/ui/PageShell";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import LogoutButton from "../../components/ui/LogoutButton";
import { autoLogout } from "../../store/actions/auth";

const StartGame = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { id } = useParams();
  const story = useSelector((state) => state.storyData.story);
  const [error, setError] = useState(null);
  const [checkingLive, setCheckingLive] = useState(true);
  const [joiningLive, setJoiningLive] = useState(false);
  const [liveTitle, setLiveTitle] = useState(null);
  const socketCleanup = useRef(null);

  useEffect(() => {
    const fetchStory = async () => {
      try {
        const token = localStorage.getItem("userToken");
        const headers = {
          "Content-Type": "application/json",
        };

        if (token) {
          headers.authorization = token;
        }

        const response = await axios.get(`/story/get/${id}`, {
          headers,
        });
        dispatch(setStory(response.data.story));

        // After fetching story, check for live session
        const inviteCode = response.data.story?.inviteCode || id;
        checkForLiveSession(inviteCode);
      } catch (err) {
        console.error("Failed to fetch story:", err);
        setError("Failed to load the story. Please check your connection and try again.");
        setCheckingLive(false);
      }
    };
    fetchStory();

    return () => {
      if (socketCleanup.current) {
        socketCleanup.current();
      }
    };
  }, [id, dispatch]);

  const checkForLiveSession = (inviteCode) => {
    try {
      const socket = getSocket();

      const onFound = ({ inviteCode: code, title }) => {
        setJoiningLive(true);
        setLiveTitle(title);
        cleanup();
        setTimeout(() => {
          navigate(`/live/play/${code}`, { replace: true });
        }, 1500);
      };

      const onNotFound = () => {
        setCheckingLive(false);
        cleanup();
      };

      const onError = () => {
        setCheckingLive(false);
        cleanup();
      };

      const cleanup = () => {
        socket.off("live-session-found", onFound);
        socket.off("live-session-not-found", onNotFound);
        socket.off("connect_error", onError);
      };

      socketCleanup.current = () => {
        cleanup();
        disconnectSocket();
      };

      socket.on("live-session-found", onFound);
      socket.on("live-session-not-found", onNotFound);
      socket.on("connect_error", onError);

      socket.emit("check-live-session", { inviteCode });

      // Timeout fallback — if no response in 3 seconds, proceed with solo mode
      setTimeout(() => {
        setCheckingLive(false);
        cleanup();
      }, 3000);
    } catch {
      setCheckingLive(false);
    }
  };

  const startGame = () => {
    if (socketCleanup.current) {
      socketCleanup.current();
      socketCleanup.current = null;
    }
    navigate("/play");
  };

  const handleLogout = async () => {
    await dispatch(autoLogout());
    navigate("/login");
  };

  if (error) {
    return (
      <PageShell>
        <Card>
          <div className="flex flex-col items-center gap-4 py-8">
            <p className="text-base text-gray-700 text-center">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
            >
              Try again
            </button>
          </div>
        </Card>
      </PageShell>
    );
  }

  // Joining a live game — show transition message
  if (joiningLive) {
    return (
      <PageShell>
        <Card>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--spacing-md)',
            padding: 'var(--spacing-xl) 0'
          }}>
            <div className="loader" style={{ margin: '0 auto' }}></div>
            <h2 className="ui-heading ui-heading--small" style={{ margin: 0 }}>
              {liveTitle ? `Joining "${liveTitle}"...` : "Joining live game..."}
            </h2>
            <p className="ui-text ui-text--secondary" style={{ textAlign: 'center' }}>
              Someone is waiting for you! Joining live game...
            </p>
          </div>
        </Card>
      </PageShell>
    );
  }

  if (!story || checkingLive) {
    return (
      <PageShell>
        <Card>
          <div className="flex justify-center items-center min-h-[200px]">
            <div className="loader"></div>
          </div>
        </Card>
      </PageShell>
    );
  }

  const token = localStorage.getItem("userToken");

  return (
    <PageShell>
      {token && <LogoutButton onClick={handleLogout} />}
      <Card>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--spacing-lg)',
          padding: 'var(--spacing-lg) 0'
        }}>
          <h1 className="ui-heading" style={{ margin: 0 }}>
            Welcome to
          </h1>
          <h2 style={{
            fontSize: '28px',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--text-primary)',
            margin: 0,
            textAlign: 'center',
            wordBreak: 'break-word'
          }}>
            {story?.title || "Untitled Story"}
          </h2>
          <Button
            onClick={startGame}
            style={{
              width: '100%',
              maxWidth: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--spacing-sm)'
            }}
          >
            <span>BEGIN</span>
            <ArrowNarrowRightIcon style={{ width: '20px', height: '20px' }} />
          </Button>
        </div>
      </Card>
    </PageShell>
  );
};

export default StartGame;
