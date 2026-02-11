import React, { useState, useEffect, useRef } from "react";
import { previewTemplates, generatePreview } from "../data/previewTemplates";

const AnimatedMadLib = () => {
  const [currentIndex, setCurrentIndex] = useState(() => 
    Math.floor(Math.random() * previewTemplates.length)
  );
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [previews, setPreviews] = useState([]);
  const containerRef = useRef(null);

  // Generate previews for all templates on mount
  useEffect(() => {
    const generatedPreviews = previewTemplates.map(template => 
      generatePreview(template)
    );
    setPreviews(generatedPreviews);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % previewTemplates.length);
        // Regenerate the next preview for variety
        const nextIndex = (currentIndex + 1) % previewTemplates.length;
        const newPreview = generatePreview(previewTemplates[nextIndex]);
        setPreviews(prev => {
          const updated = [...prev];
          updated[nextIndex] = newPreview;
          return updated;
        });
        setIsTransitioning(false);
      }, 350); // Half of transition duration
    }, 3500); // Rotate every 3.5 seconds

    return () => clearInterval(interval);
  }, [currentIndex]);

  const handleClick = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      const nextIndex = (currentIndex + 1) % previewTemplates.length;
      const newPreview = generatePreview(previewTemplates[nextIndex]);
      setPreviews(prev => {
        const updated = [...prev];
        updated[nextIndex] = newPreview;
        return updated;
      });
      setCurrentIndex(nextIndex);
      setIsTransitioning(false);
    }, 350);
  };

  if (previews.length === 0) {
    return null; // Don't render until previews are generated
  }

  const current = previews[currentIndex];
  if (!current) return null;

  // Use the pre-generated parts from the preview
  const parts = current.parts || [];

  return (
    <div 
      ref={containerRef}
      onClick={handleClick}
      style={{
        fontSize: '18px',
        lineHeight: '1.6',
        color: 'var(--text-primary)',
        textAlign: 'center',
        marginTop: '24px',
        padding: '24px',
        backgroundColor: 'rgba(243, 129, 0, 0.08)',
        borderRadius: '16px',
        border: '1px solid rgba(243, 129, 0, 0.15)',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        minHeight: '80px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: isTransitioning ? 0.6 : 1,
        transform: isTransitioning ? 'translateY(-4px)' : 'translateY(0)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(243, 129, 0, 0.12)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(243, 129, 0, 0.08)';
      }}
    >
      <div style={{ 
        transition: 'opacity 0.7s ease-in-out',
        opacity: isTransitioning ? 0 : 1
      }}>
        {parts.map((part, index) => (
          <span
            key={index}
            style={part.highlight ? {
              fontWeight: 700,
              color: 'var(--color-primary)',
              transition: 'all 0.3s ease'
            } : {
              opacity: 0.7
            }}
          >
            {part.text}
          </span>
        ))}
      </div>
    </div>
  );
};

export default AnimatedMadLib;

