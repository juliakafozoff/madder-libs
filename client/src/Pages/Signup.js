import React, { useRef } from "react";
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

      if (!res.data.token) {
        toast.error(res.data.error || "Signup failed. Email may already exist.");
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
      toast.error(errorMessage);
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
      </Card>
    </PageShell>
  );
};

export default Signup;
