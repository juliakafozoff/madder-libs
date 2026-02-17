import React, { useState, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { autoLogout } from "../store/actions/auth";
import PageShell from "../components/ui/PageShell";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import LogoutButton from "../components/ui/LogoutButton";
import logoBrunetteMan from "../assets/glad-libs-logo-brunette-man.png";
import logoBrunetteGirl from "../assets/glad-libs-brunette-girl.png";
import logoBlondeGuy from "../assets/glad-libs-blonde-guy.png";
import logoRedHairGirl from "../assets/glad-libs-red-hair-girl.png";

const LOGO_IMAGES = [
  logoBrunetteMan,
  logoBrunetteGirl,
  logoBlondeGuy,
  logoRedHairGirl
];

const Home = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [currentLogoIndex, setCurrentLogoIndex] = useState(0);
  const hasIncrementedRef = useRef(false);

  // Logo rotation logic (shared with Welcome page)
  useEffect(() => {
    // Read current index from localStorage (same key as Welcome page)
    const storedIndex = localStorage.getItem("welcomeLogoIndex");
    let index = 0;
    
    if (storedIndex !== null) {
      const parsed = parseInt(storedIndex, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed < LOGO_IMAGES.length) {
        index = parsed;
      }
    }
    
    setCurrentLogoIndex(index);
    
    // Increment for next refresh (only once, even in StrictMode)
    if (!hasIncrementedRef.current) {
      hasIncrementedRef.current = true;
      const nextIndex = (index + 1) % LOGO_IMAGES.length;
      localStorage.setItem("welcomeLogoIndex", nextIndex.toString());
    }
    
    // Preload all images
    LOGO_IMAGES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  const userLogout = async () => {
    await dispatch(autoLogout());
    navigate("/login");
  };

  return (
    <PageShell>
      <LogoutButton onClick={userLogout} />
      <Card>
        <img 
          src={LOGO_IMAGES[currentLogoIndex]} 
          alt="Glad Libs" 
          style={{
            maxWidth: '300px',
            width: '100%',
            height: 'auto',
            display: 'block',
            margin: '0 auto 16px auto'
          }}
        />
        <h1 className="ui-heading ui-heading--large">Welcome</h1>
        <Button onClick={() => navigate("/create")}>
          Create a Game
        </Button>
        <Button onClick={() => navigate("/join")}>
          Join a Game
        </Button>
        <Button variant="secondary" onClick={() => navigate("/oldstories")}>
          My Stories
        </Button>
      </Card>
    </PageShell>
  );
};

export default Home;
