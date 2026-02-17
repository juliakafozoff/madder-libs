import React, { useState, useEffect } from "react";
import { getLogoIndex } from "../utils/logoRotation";
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

/**
 * RotatingLogo component - displays the current Glad Libs logo based on shared state
 * Updates automatically when logo rotates via custom event
 * 
 * @param {Object} props
 * @param {string} props.maxWidth - Max width of the logo (default: '300px')
 * @param {string} props.marginBottom - Bottom margin (default: '16px')
 * @param {string} props.alt - Alt text (default: 'Glad Libs')
 */
const RotatingLogo = ({ 
  maxWidth = '300px', 
  marginBottom = '16px',
  alt = 'Glad Libs'
}) => {
  const [currentLogoIndex, setCurrentLogoIndex] = useState(() => getLogoIndex());

  useEffect(() => {
    // Set initial logo index
    setCurrentLogoIndex(getLogoIndex());

    // Listen for logo rotation events
    const handleLogoRotated = (event) => {
      setCurrentLogoIndex(event.detail.index);
    };

    window.addEventListener("gladlibs:logo-rotated", handleLogoRotated);

    // Preload all images for smooth transitions
    LOGO_IMAGES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });

    return () => {
      window.removeEventListener("gladlibs:logo-rotated", handleLogoRotated);
    };
  }, []);

  return (
    <img 
      src={LOGO_IMAGES[currentLogoIndex]} 
      alt={alt}
      style={{
        maxWidth,
        width: '100%',
        height: 'auto',
        display: 'block',
        margin: `0 auto ${marginBottom} auto`
      }}
    />
  );
};

export default RotatingLogo;

