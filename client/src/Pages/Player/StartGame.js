import React, { useEffect } from "react";
import { ArrowNarrowRightIcon } from "@heroicons/react/outline";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import axios from "../../axios";
import { setStory } from "../../store/actions/story";
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

  useEffect(() => {
    const fetchStory = async () => {
      const token = localStorage.getItem("userToken");
      const headers = {
        "Content-Type": "application/json",
      };
      
      // Only include authorization header if token exists
      if (token) {
        headers.authorization = token;
      }
      
      // The backend /story/get/:id now handles both inviteCode and storyId
      const response = await axios.get(`/story/get/${id}`, {
        headers,
      });
      dispatch(setStory(response.data.story));
    };
    fetchStory();
  }, [id, dispatch]);

  const startGame = () => {
    navigate("/play");
  };

  const handleLogout = async () => {
    await dispatch(autoLogout());
    navigate("/login");
  };

  if (!story) {
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
