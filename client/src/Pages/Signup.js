import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../axios";
import { useDispatch } from "react-redux";
import * as authActions from "../store/actions/auth";
import PageShell from "../components/ui/PageShell";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import TextInput from "../components/ui/TextInput";
import { useToast } from "../components/ui/Toast";

const Signup = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const toast = useToast();

  const nameRef = useRef("");
  const emailRef = useRef("");
  const passwordRef = useRef("");
  const [error, setError] = useState("");

  const handleSignUp = async () => {
    setError("");
    const name = nameRef.current.value.trim();
    const email = emailRef.current.value.trim();
    const password = passwordRef.current.value;

    if (!name) {
      setError("Name is required.");
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    try {
      const res = await axios.post(
        "/user/signup",
        {
          name,
          email,
          password,
          type: "email",
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.data.token) {
        setError(res.data.error || "Signup failed. Email may already exist.");
        return;
      }

      emailRef.current.value = "";
      nameRef.current.value = "";
      passwordRef.current.value = "";
      localStorage.setItem("userToken", res.data.token);
      await dispatch(authActions.login(res.data.token));
      navigate("/home");
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || "Signup failed. Please try again.";
      setError(errorMessage);
    }
  };

  return (
    <PageShell>
      <Card>
        <h1 className="ui-heading">Signup</h1>
        <TextInput
          inputRef={nameRef}
          type="text"
          placeholder="Name"
          label="Name"
          required
          onChange={() => setError("")}
        />
        <TextInput
          inputRef={emailRef}
          type="email"
          placeholder="Email"
          label="Email"
          required
          onChange={() => setError("")}
        />
        <TextInput
          inputRef={passwordRef}
          type="password"
          placeholder="Password"
          label="Password"
          required
          onChange={() => setError("")}
        />
        {error && <p style={{ color: '#ef4444', textAlign: 'center', marginTop: '8px', fontSize: '14px' }}>{error}</p>}
        <Button onClick={handleSignUp}>
          Register
        </Button>
      </Card>
    </PageShell>
  );
};

export default Signup;
