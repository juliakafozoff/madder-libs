import React, { useRef, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../axios";
import { useDispatch } from "react-redux";
import * as authActions from "../store/actions/auth";
import PageShell from "../components/ui/PageShell";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import TextInput from "../components/ui/TextInput";
import { getSafeJwtFields } from "../utils/jwt";

const Login = () => {
  const navigate = useNavigate();
  const [type, setType] = useState(true);
  const dispatch = useDispatch();

  const emailRef = useRef("");
  const passwordRef = useRef("");

  const handleGoogle = async (googleData) => {
    console.log("=== handleGoogle called ===", googleData);
    
    // Debug: Log frontend Google Client ID
    const frontendClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    console.log("[DEBUG] Frontend Google Client ID:", frontendClientId ? `${frontendClientId.substring(0, 20)}...` : "NOT SET");
    
    // Check if this is a failure response (no tokenId)
    if (!googleData || !googleData.tokenId) {
      console.error("Google login failed: No tokenId in response", googleData);
      alert("Google login was cancelled or failed. Please try again.");
      return;
    }
    
    // Debug: Decode and log token payload fields (safe)
    const tokenFields = getSafeJwtFields(googleData.tokenId);
    if (tokenFields) {
      console.log("[DEBUG] Google ID Token payload fields:", {
        aud: tokenFields.aud,
        iss: tokenFields.iss,
        azp: tokenFields.azp,
        exp: tokenFields.exp,
        email: tokenFields.email,
        tokenType: "id_token"
      });
      console.log("[DEBUG] Token audience (aud):", tokenFields.aud);
      console.log("[DEBUG] Expected audience (frontend client ID):", frontendClientId);
      
      // Check for audience mismatch
      if (tokenFields.aud && frontendClientId && tokenFields.aud !== frontendClientId) {
        const errorMsg = `Google OAuth audience mismatch. Token audience: ${tokenFields.aud}, Expected: ${frontendClientId}. Please ensure REACT_APP_GOOGLE_CLIENT_ID matches the Google OAuth client ID used to generate the token.`;
        console.error("[ERROR]", errorMsg);
        alert(errorMsg);
        return;
      }
    } else {
      console.warn("[DEBUG] Could not decode JWT token payload");
    }
    
    console.log("Google tokenId received:", googleData.tokenId.substring(0, 50) + "...");
    
    try {
      console.log("Calling backend for Google login...");
      const res = await axios.post(
        "/user/v1/auth/google/login",
        {
          token: googleData.tokenId,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      
      // Check if backend returned a token
      if (!res.data || !res.data.token) {
        const errorMsg = res.data?.msg || "Google login failed: No token received";
        console.error("Google login backend error:", errorMsg);
        alert(errorMsg);
        return;
      }
      
      // Store JWT token in localStorage
      const jwtToken = res.data.token;
      localStorage.setItem("token", jwtToken);
      localStorage.setItem("userToken", jwtToken); // Also store as userToken for compatibility
      
      console.log("Google login successful, token stored:", jwtToken.substring(0, 20) + "...");
      console.log("Full response:", res.data);
      
      // Navigate directly - PrivateRoute will handle fetching user data
      // This avoids the issue where authActions.login() removes token on failure
      console.log("Attempting navigation to /home...");
      try {
        navigate("/home", { replace: true });
        // Fallback to window.location if navigate doesn't work
        setTimeout(() => {
          if (window.location.pathname !== "/home") {
            console.log("Navigate didn't work, using window.location");
            window.location.href = "/home";
          }
        }, 100);
      } catch (navError) {
        console.error("Navigation error:", navError);
        window.location.href = "/home";
      }
    } catch (error) {
      let errorMessage = error.response?.data?.msg || error.message || "Google login failed. Please try again.";
      
      // Enhanced error handling for audience mismatch
      if (errorMessage.includes("Wrong recipient") || errorMessage.includes("audience")) {
        const tokenFields = getSafeJwtFields(googleData.tokenId);
        if (tokenFields) {
          errorMessage = `Google OAuth audience mismatch. Token audience: ${tokenFields.aud}, Backend expected: ${frontendClientId}. Please ensure REACT_APP_GOOGLE_CLIENT_ID (frontend) matches GOOGLE_CLIENT_ID (backend).`;
        }
      }
      
      console.error("Google login error:", {
        message: errorMessage,
        response: error.response?.data,
        error: error
      });
      alert(errorMessage);
    }
  };

  const handleGoogleCredential = useCallback((response) => {
    console.log("=== Google credential response ===", response);
    
    if (response.credential) {
      // response.credential is the ID token (JWT)
      handleGoogle({ tokenId: response.credential });
    } else {
      console.error("No credential in response:", response);
      alert("Google login failed: No credential received");
    }
  }, [handleGoogle]);

  // Initialize Google Sign In button
  useEffect(() => {
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    if (!clientId || !type) return; // Only render when on the first screen (type === true)

    const initializeGoogleSignIn = () => {
      if (window.google && window.google.accounts && window.google.accounts.id) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCredential,
        });

        // Render the button - clear container first to avoid duplicates
        const buttonContainer = document.getElementById('google-login-button');
        if (buttonContainer) {
          buttonContainer.innerHTML = ''; // Clear any existing button
          window.google.accounts.id.renderButton(buttonContainer, {
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            width: 300,
          });
        }
      }
    };

    // Wait for Google script to load
    if (window.google && window.google.accounts && window.google.accounts.id) {
      // Small delay to ensure DOM is ready
      setTimeout(initializeGoogleSignIn, 100);
    } else {
      // Retry after a delay
      const checkGoogle = setInterval(() => {
        if (window.google && window.google.accounts && window.google.accounts.id) {
          initializeGoogleSignIn();
          clearInterval(checkGoogle);
        }
      }, 100);
      
      // Cleanup after 5 seconds
      setTimeout(() => clearInterval(checkGoogle), 5000);
    }

    // Cleanup function
    return () => {
      const buttonContainer = document.getElementById('google-login-button');
      if (buttonContainer) {
        buttonContainer.innerHTML = '';
      }
    };
  }, [handleGoogleCredential, type]);

  const handleLogin = async () => {
    if (!emailRef.current.value || !passwordRef.current.value) {
      alert("Enter all the details");
      return;
    }
    try {
      const res = await axios.post(
        "/user/login",
        {
          email: emailRef.current.value,
          password: passwordRef.current.value,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      emailRef.current.value = "";
      passwordRef.current.value = "";
      localStorage.setItem("userToken", res.data.token);
      dispatch(authActions.login(res.data.token));
      navigate("/home");
    } catch (error) {
      alert(error.message);
    }
  };
  return (
    <PageShell>
      <Card>
        <h1 className="ui-heading">Login</h1>
        {type ? (
          <>
            <Button onClick={() => setType(false)}>
              Login with Email
            </Button>
            {process.env.REACT_APP_GOOGLE_CLIENT_ID ? (
              <div id="google-login-button" className="ui-google-container" />
            ) : (
              <div className="ui-text--secondary" style={{ fontSize: '12px', textAlign: 'center' }}>
                Google login is not configured. Please set REACT_APP_GOOGLE_CLIENT_ID in your .env file.
              </div>
            )}
          </>
        ) : (
          <>
            <TextInput
              inputRef={emailRef}
              type="email"
              placeholder="Email"
              label="Email"
              required
            />
            <TextInput
              inputRef={passwordRef}
              type="password"
              placeholder="Password"
              label="Password"
              required
            />
            <Button onClick={handleLogin}>
              Login
            </Button>
            <Button variant="tertiary" onClick={() => setType(true)}>
              Go Back
            </Button>
          </>
        )}
      </Card>
    </PageShell>
  );
};

export default Login;
