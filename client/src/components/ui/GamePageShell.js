import React from "react";
import "../../styles/ui.css";

const GamePageShell = ({ children, className = "" }) => {
  return (
    <div className={`game-page-shell ${className}`}>
      {children}
    </div>
  );
};

export default GamePageShell;

