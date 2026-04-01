import React, { useRef, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../axios";
import { useDispatch } from "react-redux";
import * as authActions from "../store/actions/auth";
import PageShell from "../components/ui/PageShell";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import TextInput from "../components/ui/TextInput";
import RotatingLogo from "../components/RotatingLogo";
import { getSafeJwtFields } from "../utils/jwt";
import { useToast } from "../components/ui/Toast";

const Login = () => {
  const navigate = useNavigate();
  const [type, setType] = useState(true);
  const dispatch = useDispatch();
  const toast = useToast();

  const emailRef = useRef("");
  const passwordRef = useRef("");

  const handleGoogle = useCallback(async (googleData) => {
    const frontendClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

    if (!googleData || !googleData.tokenId) {
      toast.error("Google login was cancelled or failed. Please try again.");
      return;
    }

    const tokenFields = getSafeJwtFields(googleData.tokenId);
    if (tokenFields && tokenFields.aud && frontendClientId && tokenFields.aud !== frontendClientId) {
      toast.error("Google login configuration error. Please contact support.");
      return;
    }

    try {
      const res = await axios.post(
        "/user/v1/auth/google/login",
        { token: googleData.tokenId },
        { headers: { "Content-Type": "application/json" } }
      );

      if (!res.data || !res.data.token) {
        toast.error(res.data?.error || "Google login failed. Please try again.");
        return;
      }

      const jwtToken = res.data.token;
      localStorage.setItem("userToken", jwtToken);
      await dispatch(authActions.login(jwtToken));
      navigate("/home", { replace: true });
    } catch (error) {
      let errorMessage = error.response?.data?.error || error.message || "Google login failed. Please try again.";
      if (errorMessage.includes("Wrong recipient") || errorMessage.includes("audience")) {
        errorMessage = "Google login configuration error. Please contact support.";
      }
      toast.error(errorMessage);
    }
  }, [dispatch, navigate, toast]);

  const handleGoogleCredential = useCallback((response) => {
    if (response.credential) {
      handleGoogle({ tokenId: response.credential });
    } else {
      toast.error("Google login failed. Please try again.");
    }
  }, [handleGoogle, toast]);

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
      toast.info("Enter all the details");
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
      toast.error(error.response?.data?.error || error.message);
    }
  };
  return (
    <PageShell>
      <Card>
        <RotatingLogo 
          maxWidth="320px"
          marginBottom="20px"
          alt="Glad Libs"
        />
        <h1 className="ui-heading ui-heading--small" style={{ marginTop: 0 }}>Login</h1>
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
