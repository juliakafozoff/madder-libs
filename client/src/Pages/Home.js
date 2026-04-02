import React from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import PageShell from "../components/ui/PageShell";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import LogoutButton from "../components/ui/LogoutButton";
import RotatingLogo from "../components/RotatingLogo";

const Home = () => {
  const navigate = useNavigate();
  const { isAuthenticated, signOut } = useAuth();
  const user = useSelector((state) => state.auth.user);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <PageShell>
      {isAuthenticated && <LogoutButton onClick={handleLogout} />}
      <Card>
        <RotatingLogo
          maxWidth="300px"
          marginBottom="16px"
          alt="Glad Libs"
        />
        <h1 className="ui-heading ui-heading--large">
          {isAuthenticated && user?.name ? `Hey, ${user.name.split(' ')[0]}!` : 'Welcome'}
        </h1>
        <Button onClick={() => navigate("/create")} title="Write your own story and choose which words become blanks for your friends to fill in">
          Create a Game
        </Button>
        <Button variant="secondary" onClick={() => navigate("/library")} title="Choose from classic speeches, poems, and more — then pick which words to blank out">
          Pick a Famous Text
        </Button>
        <Button onClick={() => navigate("/join")}>
          Join a Game
        </Button>
        {isAuthenticated && (
          <Button variant="secondary" onClick={() => navigate("/oldstories")}>
            My Stories
          </Button>
        )}
        {!isAuthenticated && (
          <div style={{
            marginTop: 'var(--spacing-md)',
            padding: 'var(--spacing-md)',
            backgroundColor: 'rgba(243, 129, 0, 0.05)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
          }}>
            <p style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              margin: '0 0 var(--spacing-sm) 0',
            }}>
              Sign up to save your stories and see when friends play them
            </p>
            <button
              onClick={() => navigate("/auth")}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-primary)',
                fontSize: '15px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: 500,
              }}
            >
              Create free account
            </button>
          </div>
        )}
      </Card>
    </PageShell>
  );
};

export default Home;
