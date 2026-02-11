import React from "react";
import "../../styles/ui.css";

const PageShell = ({ children, className = "", wide = false }) => {
  const wideClass = wide ? "page-shell--wide" : "";
  return (
    <div className={`page-shell ${wideClass} ${className}`}>
      {children}
    </div>
  );
};

export default PageShell;

