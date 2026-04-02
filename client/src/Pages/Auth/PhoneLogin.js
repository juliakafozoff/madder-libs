import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PhoneInput from "react-phone-number-input";
import { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import {
  signInWithPhoneNumber,
  signInWithPopup,
  GoogleAuthProvider,
  linkWithCredential,
  PhoneAuthProvider,
} from "firebase/auth";
import { auth, setupRecaptcha } from "../../services/firebase";
import axios from "../../axios";
import { useDispatch } from "react-redux";
import * as authActions from "../../store/actions/auth";
import PageShell from "../../components/ui/PageShell";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import RotatingLogo from "../../components/RotatingLogo";

const RESEND_COOLDOWN = 30;

const PhoneLogin = ({ asModal = false, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [phone, setPhone] = useState("");
  const [step, setStep] = useState("phone"); // "phone" | "code"
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [resendTimer, setResendTimer] = useState(0);

  const codeRefs = useRef([]);
  const recaptchaRef = useRef(null);
  const recaptchaContainerRef = useRef(null);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const initRecaptcha = useCallback(() => {
    if (recaptchaRef.current) {
      recaptchaRef.current.clear();
      recaptchaRef.current = null;
    }
    if (recaptchaContainerRef.current) {
      recaptchaContainerRef.current.innerHTML = "";
    }
    recaptchaRef.current = setupRecaptcha("recaptcha-container");
  }, []);

  const handleSendCode = async () => {
    setError("");
    if (!phone || !isValidPhoneNumber(phone)) {
      setError("Please enter a valid phone number");
      return;
    }
    if (!auth) {
      setError("Auth is not configured. Please contact support.");
      return;
    }

    setLoading(true);
    try {
      initRecaptcha();
      const result = await signInWithPhoneNumber(auth, phone, recaptchaRef.current);
      setConfirmationResult(result);
      setStep("code");
      setResendTimer(RESEND_COOLDOWN);
      setCode(["", "", "", "", "", ""]);
      setTimeout(() => codeRefs.current[0]?.focus(), 100);
    } catch (err) {
      console.error("Phone auth error:", err);
      if (err.code === "auth/too-many-requests") {
        setError("Too many attempts. Please try again later.");
      } else if (err.code === "auth/invalid-phone-number") {
        setError("Please enter a valid phone number");
      } else {
        setError("Failed to send code. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    await handleSendCode();
  };

  const completeAuth = async (firebaseUser) => {
    try {
      const idToken = await firebaseUser.getIdToken();
      const res = await axios.post("/auth/firebase", { firebaseToken: idToken });
      const jwt = res.data.token;
      localStorage.setItem("userToken", jwt);
      await dispatch(authActions.login(jwt));
      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/home");
      }
    } catch (err) {
      console.error("Backend auth error:", err);
      setError("Something went wrong. Please try again.");
    }
  };

  const handleCodeChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...code];
    next[index] = value;
    setCode(next);

    if (value && index < 5) {
      codeRefs.current[index + 1]?.focus();
    }

    if (next.every((d) => d !== "")) {
      verifyCode(next.join(""));
    }
  };

  const handleCodeKeyDown = (index, e) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = [...code];
    for (let i = 0; i < 6; i++) {
      next[i] = pasted[i] || "";
    }
    setCode(next);
    if (pasted.length === 6) {
      verifyCode(pasted);
    } else {
      codeRefs.current[pasted.length]?.focus();
    }
  };

  const verifyCode = async (pin) => {
    if (!confirmationResult) return;
    setError("");
    setLoading(true);
    try {
      // If the current user is anonymous, try linking instead of confirming directly
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.isAnonymous) {
        const credential = PhoneAuthProvider.credential(
          confirmationResult.verificationId,
          pin
        );
        try {
          const result = await linkWithCredential(currentUser, credential);
          await completeAuth(result.user);
          return;
        } catch (linkErr) {
          if (linkErr.code === "auth/credential-already-in-use") {
            // Phone number belongs to another account — sign in with that account
            // and merge anonymous data on the backend
            const anonymousUid = currentUser.uid;
            const result = await confirmationResult.confirm(pin);
            try {
              await axios.post("/auth/merge", {
                anonymousUid,
                permanentUid: result.user.uid,
              });
            } catch (mergeErr) {
              console.error("Merge error:", mergeErr);
            }
            await completeAuth(result.user);
            return;
          }
          throw linkErr;
        }
      }

      const result = await confirmationResult.confirm(pin);
      await completeAuth(result.user);
    } catch (err) {
      console.error("Code verification error:", err);
      if (err.code === "auth/invalid-verification-code") {
        setError("Incorrect code. Please try again.");
      } else if (err.code === "auth/code-expired") {
        setError("Code expired. Tap to resend.");
      } else {
        setError("Verification failed. Please try again.");
      }
      setCode(["", "", "", "", "", ""]);
      codeRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth) {
      setError("Auth is not configured. Please contact support.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const currentUser = auth.currentUser;

      if (currentUser && currentUser.isAnonymous) {
        try {
          const result = await linkWithCredential(
            currentUser,
            GoogleAuthProvider.credential(
              (await signInWithPopup(auth, provider)).user.getIdToken()
            )
          );
          await completeAuth(result.user);
          return;
        } catch (linkErr) {
          if (linkErr.code !== "auth/credential-already-in-use") throw linkErr;
          const anonymousUid = currentUser.uid;
          const result = await signInWithPopup(auth, provider);
          try {
            await axios.post("/auth/merge", {
              anonymousUid,
              permanentUid: result.user.uid,
            });
          } catch (mergeErr) {
            console.error("Merge error:", mergeErr);
          }
          await completeAuth(result.user);
          return;
        }
      }

      const result = await signInWithPopup(auth, provider);
      await completeAuth(result.user);
    } catch (err) {
      console.error("Google sign-in error:", err);
      if (err.code === "auth/popup-closed-by-user") {
        // User closed popup, not an error
      } else {
        setError("Google sign-in failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <>
      <RotatingLogo maxWidth="280px" marginBottom="12px" alt="Glad Libs" />

      {step === "phone" && (
        <>
          <h1
            className="ui-heading ui-heading--small"
            style={{ marginTop: 0, marginBottom: 0 }}
          >
            Enter your phone number
          </h1>

          <div style={{ width: "100%" }}>
            <PhoneInput
              international
              defaultCountry="US"
              value={phone}
              onChange={(val) => {
                setPhone(val || "");
                setError("");
              }}
              style={{
                width: "100%",
                padding: "var(--spacing-md)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-md)",
                fontSize: "16px",
                backgroundColor: "var(--color-secondary)",
              }}
            />
          </div>

          {error && (
            <p
              style={{
                color: "#ef4444",
                textAlign: "center",
                fontSize: "14px",
                margin: 0,
              }}
            >
              {error}
            </p>
          )}

          <Button onClick={handleSendCode} disabled={loading}>
            {loading ? "Sending..." : "Send Code"}
          </Button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--spacing-md)",
              width: "100%",
            }}
          >
            <div
              style={{
                flex: 1,
                height: "1px",
                backgroundColor: "var(--border-color)",
              }}
            />
            <span
              style={{
                color: "var(--text-secondary)",
                fontSize: "14px",
                fontWeight: "var(--font-weight-medium)",
              }}
            >
              or
            </span>
            <div
              style={{
                flex: 1,
                height: "1px",
                backgroundColor: "var(--border-color)",
              }}
            />
          </div>

          <Button variant="secondary" onClick={handleGoogleSignIn} disabled={loading}>
            Continue with Google
          </Button>
        </>
      )}

      {step === "code" && (
        <>
          <h1
            className="ui-heading ui-heading--small"
            style={{ marginTop: 0, marginBottom: 0 }}
          >
            Enter verification code
          </h1>
          <p
            style={{
              color: "var(--text-secondary)",
              textAlign: "center",
              fontSize: "14px",
              margin: 0,
            }}
          >
            Sent to {phone}
          </p>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (codeRefs.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(i, e.target.value)}
                onKeyDown={(e) => handleCodeKeyDown(i, e)}
                onPaste={i === 0 ? handleCodePaste : undefined}
                disabled={loading}
                autoFocus={i === 0}
                style={{
                  width: "48px",
                  height: "56px",
                  textAlign: "center",
                  fontSize: "24px",
                  fontWeight: "var(--font-weight-bold)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-md)",
                  outline: "none",
                  transition: "border-color var(--transition-base)",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--color-primary)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(243, 129, 0, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "var(--border-color)";
                  e.target.style.boxShadow = "none";
                }}
              />
            ))}
          </div>

          {error && (
            <p
              style={{
                color: "#ef4444",
                textAlign: "center",
                fontSize: "14px",
                margin: 0,
              }}
            >
              {error}
            </p>
          )}

          {loading && (
            <p
              style={{
                textAlign: "center",
                color: "var(--text-secondary)",
                fontSize: "14px",
                margin: 0,
              }}
            >
              Verifying...
            </p>
          )}

          <div style={{ textAlign: "center" }}>
            {resendTimer > 0 ? (
              <span
                style={{
                  color: "var(--text-secondary)",
                  fontSize: "14px",
                }}
              >
                Resend in {resendTimer}s
              </span>
            ) : (
              <button
                onClick={handleResend}
                disabled={loading}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--color-primary)",
                  fontSize: "14px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontWeight: "var(--font-weight-medium)",
                }}
              >
                Resend code
              </button>
            )}
          </div>

          <Button
            variant="tertiary"
            onClick={() => {
              setStep("phone");
              setError("");
              setCode(["", "", "", "", "", ""]);
            }}
          >
            Use a different number
          </Button>
        </>
      )}

      <div id="recaptcha-container" ref={recaptchaContainerRef} />
    </>
  );

  if (asModal) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "var(--spacing-md)",
        }}
        onClick={onClose}
      >
        <div onClick={(e) => e.stopPropagation()}>
          <Card>
            <button
              onClick={onClose}
              style={{
                position: "absolute",
                top: "var(--spacing-md)",
                right: "var(--spacing-md)",
                background: "none",
                border: "none",
                fontSize: "24px",
                cursor: "pointer",
                color: "var(--text-secondary)",
                lineHeight: 1,
              }}
            >
              x
            </button>
            {content}
          </Card>
        </div>
      </div>
    );
  }

  return (
    <PageShell>
      <Card>{content}</Card>
    </PageShell>
  );
};

export default PhoneLogin;
