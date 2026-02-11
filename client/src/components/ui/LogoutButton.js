import React from "react";
import "../../styles/ui.css";

const LogoutButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="ui-logout"
      aria-label="Logout"
    >
      Logout
    </button>
  );
};

export default LogoutButton;

