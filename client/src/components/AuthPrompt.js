import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import PhoneLogin from "../Pages/Auth/PhoneLogin";

const AuthPrompt = ({ message = "Save your stories \u2014 enter your phone number" }) => {
  const { isAuthenticated } = useAuth();
  const [showModal, setShowModal] = useState(false);

  if (isAuthenticated) return null;

  return (
    <>
      <div
        style={{
          marginTop: "var(--spacing-lg)",
          padding: "var(--spacing-md)",
          backgroundColor: "rgba(243, 129, 0, 0.05)",
          borderRadius: "var(--radius-md)",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: "14px",
            color: "var(--text-secondary)",
            margin: "0 0 var(--spacing-sm) 0",
          }}
        >
          {message}
        </p>
        <button
          onClick={() => setShowModal(true)}
          style={{
            background: "none",
            border: "none",
            color: "var(--color-primary)",
            fontSize: "15px",
            cursor: "pointer",
            fontFamily: "inherit",
            fontWeight: 500,
          }}
        >
          Sign in
        </button>
      </div>

      {showModal && (
        <PhoneLogin
          asModal
          onClose={() => setShowModal(false)}
          onSuccess={() => setShowModal(false)}
        />
      )}
    </>
  );
};

export default AuthPrompt;
