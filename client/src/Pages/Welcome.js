import React from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../components/ui/PageShell";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import AnimatedMadLib from "../components/AnimatedMadLib";
import madLibsLogo from "../assets/madlibslogo.png";

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <PageShell>
      <Card style={{ padding: '56px 48px' }}>
        <img 
          src={madLibsLogo} 
          alt="Mad Libs" 
          style={{
            maxWidth: '480px',
            width: '100%',
            height: 'auto',
            display: 'block',
            margin: '0 auto'
          }}
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
          marginTop: '40px'
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
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-primary)',
              fontSize: '15px',
              cursor: 'pointer',
              textDecoration: 'none',
              padding: '8px',
              fontFamily: 'inherit',
              fontWeight: 500,
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--color-primary-hover)';
              e.currentTarget.style.textDecoration = 'underline';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--color-primary)';
              e.currentTarget.style.textDecoration = 'none';
            }}
          >
            New here? Sign up for free
          </button>
        </div>
      </Card>
    </PageShell>
  );
};

export default Welcome;
