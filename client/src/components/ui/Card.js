import React from "react";
import "../../styles/ui.css";

const Card = ({ children, className = "", wide = false }) => {
  const wideClass = wide ? "ui-card--wide" : "";
  return (
    <div className={`ui-card ${wideClass} ${className}`}>
      {children}
    </div>
  );
};

export default Card;

