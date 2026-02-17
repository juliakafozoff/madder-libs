import React from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../components/ui/PageShell";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import AnimatedMadLib from "../components/AnimatedMadLib";
import RotatingLogo from "../components/RotatingLogo";

const Welcome = () => {
  const navigate = useNavigate();

  // Shared styles for bottom links
  const linkStyles = {
    background: 'none',
    border: 'none',
    color: 'var(--color-primary)',
    fontSize: '16px',
    cursor: 'pointer',
    textDecoration: 'none',
    padding: '10px 12px',
    fontFamily: 'inherit',
    fontWeight: 500,
    transition: 'all 0.2s ease',
    borderRadius: '4px'
  };

  return (
    <PageShell>
      <Card style={{ padding: '56px 48px' }}>
        <RotatingLogo 
          maxWidth="480px"
          marginBottom="0"
          alt="Mad Libs"
        />
        <p style={{
          textAlign: 'center',
          fontSize: '18px',
          color: 'var(--text-secondary)',
          marginTop: '32px',
          marginBottom: 0,
          lineHeight: '1.6',
          fontWeight: 400
        }}>
          Create a fill-in-the-blank story. Send a friend the link. They plug in words without seeing the context—then comes the ridiculous reveal.
        </p>
        
        <AnimatedMadLib />
        
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          marginTop: '24px'
        }}>
          <Button onClick={() => navigate("/create")}>
            Create Your Story
          </Button>
          <Button variant="secondary" onClick={() => navigate("/login")}>
            Log In
          </Button>
        </div>
        <div style={{
          textAlign: 'center',
          marginTop: '20px'
        }}>
          <button
            onClick={() => navigate("/signup")}
            style={linkStyles}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--color-primary-hover)';
              e.currentTarget.style.textDecoration = 'underline';
              e.currentTarget.style.backgroundColor = 'rgba(243, 129, 0, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--color-primary)';
              e.currentTarget.style.textDecoration = 'none';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            New here? Sign up for free
          </button>
        </div>
        <div style={{
          textAlign: 'center',
          marginTop: '8px'
        }}>
          <button
            onClick={() => navigate("/join")}
            style={{
              ...linkStyles,
              fontWeight: 400,
              opacity: 0.85
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--color-primary-hover)';
              e.currentTarget.style.textDecoration = 'underline';
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.backgroundColor = 'rgba(243, 129, 0, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--color-primary)';
              e.currentTarget.style.textDecoration = 'none';
              e.currentTarget.style.opacity = '0.85';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Got a link or code? Join a game →
          </button>
        </div>
      </Card>
    </PageShell>
  );
};

export default Welcome;
