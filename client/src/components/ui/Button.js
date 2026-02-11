import React from "react";
import "../../styles/ui.css";

const Button = ({ 
  children, 
  variant = "primary", 
  type = "button",
  onClick,
  disabled = false,
  className = "",
  ...props 
}) => {
  const variantClass = `ui-button--${variant}`;
  
  return (
    <button
      type={type}
      className={`ui-button ${variantClass} ${className}`}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;

