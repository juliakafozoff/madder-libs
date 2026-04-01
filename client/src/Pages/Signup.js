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
import { useToast } from "../components/ui/Toast";

const Signup = () => {
  const navigate = useNavigate();
  const [type, setType] = useState(true);
  const dispatch = useDispatch();
  const toast = useToast();

  const nameRef = useRef("");
  const emailRef = useRef("");
  const passwordRef = useRef("");

  const handleGoogle = useCallback(async (googleData) => {
    const frontendClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

    if (!googleData || !googleData.tokenId) {
      toast.error("Google signup was cancelled or failed. Please try again.");
      return;
    }

    const tokenFields = getSafeJwtFields(googleData.tokenId);
    if (tokenFields && tokenFields.aud && frontendClientId && tokenFields.aud !== frontendClientId) {
      toast.error("Google signup configuration error. Please contact support.");
      return;
    }

    try {
      const res = await axios.post(
        "/user/v1/auth/google/signup",
        { token: googleData.tokenId },
        { headers: { "Content-Type": "application/json" } }
      );

      if (!res.data || !res.data.token) {
        toast.error(res.data?.error || "Google signup failed. Please try again.");
        return;
      }

      const jwtToken = res.data.token;
      localStorage.setItem("userToken", jwtToken);
      await dispatch(authActions.login(jwtToken));
      navigate("/home", { replace: true });
    } catch (error) {
      let errorMessage = error.response?.data?.error || error.message || "Google signup failed. Please try again.";
      if (errorMessage.includes("Wrong recipient") || errorMessage.includes("audience")) {
        errorMessage = "Google signup configuration error. Please contact support.";
      }
      toast.error(errorMessage);
    }
  }, [dispatch, navigate, toast]);

  const handleGoogleCredential = useCallback((response) => {
    if (response.credential) {
      handleGoogle({ tokenId: response.credential });
    } else {
      toast.error("Google signup failed. Please try again.");
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
        const buttonContainer = document.getElementById('google-signin-button');
        if (buttonContainer) {
          buttonContainer.innerHTML = ''; // Clear any existing button
          window.google.accounts.id.renderButton(buttonContainer, {
            theme: 'outline',
            size: 'large',
            text: 'signup_with',
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
      const buttonContainer = document.getElementById('google-signin-button');
      if (buttonContainer) {
        buttonContainer.innerHTML = '';
      }
    };
  }, [handleGoogleCredential, type]);

  const handleSignUp = async () => {
    if (
      !nameRef.current.value ||
      !emailRef.current.value ||
      !passwordRef.current.value
    ) {
      toast.info("Enter all the details");
      return;
    }
    try {
      const res = await axios.post(
        "/user/signup",
        {
          name: nameRef.current.value,
          email: emailRef.current.value,
          password: passwordRef.current.value,
          type: "email",
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      
      // Check if signup was successful (has token) or if email already exists
      if (!res.data.token) {
        toast.error(res.data.error || "Signup failed. Email may already exist.");
        return;
      }
      
      emailRef.current.value = "";
      nameRef.current.value = "";
      passwordRef.current.value = "";
      localStorage.setItem("userToken", res.data.token);
      
      // Wait for login action to complete before navigating
      await dispatch(authActions.login(res.data.token));
      navigate("/home");
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || "Signup failed. Please try again.";
      toast.error(errorMessage);
      console.error("Signup error:", error);
    }
  };

  return (
    <PageShell>
      <Card>
        <h1 className="ui-heading">Signup</h1>
        {type ? (
          <>
            <Button onClick={() => setType(false)}>
              Signup with Email
            </Button>
            {process.env.REACT_APP_GOOGLE_CLIENT_ID ? (
              <div id="google-signin-button" className="ui-google-container" />
            ) : (
              <div className="ui-text--secondary" style={{ fontSize: '12px', textAlign: 'center' }}>
                Google signup is not configured. Please set REACT_APP_GOOGLE_CLIENT_ID in your .env file.
              </div>
            )}
          </>
        ) : (
          <>
            <TextInput
              inputRef={nameRef}
              type="text"
              placeholder="Name"
              label="Name"
              required
            />
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
            <Button onClick={handleSignUp}>
              Register
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

export default Signup;
