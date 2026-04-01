import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../axios";
import { useDispatch } from "react-redux";
import * as authActions from "../store/actions/auth";
import PageShell from "../components/ui/PageShell";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import TextInput from "../components/ui/TextInput";
import RotatingLogo from "../components/RotatingLogo";

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const emailRef = useRef("");
  const passwordRef = useRef("");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");
    if (!emailRef.current.value || !passwordRef.current.value) {
      setError("Please enter your email and password.");
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
      await dispatch(authActions.login(res.data.token));
      navigate("/home");
    } catch (error) {
      setError(error.response?.data?.error || error.message);
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
        <Button onClick={handleLogin}>
          Login
        </Button>
      </Card>
    </PageShell>
  );
};

export default Login;
