import React, { useEffect, useState, useCallback } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import * as authActions from "../store/actions/auth";

const PrivateRoute = () => {
  const user = useSelector((state) => state.auth.user);
  const loginFailed = useSelector((state) => state.auth.loginFailed);
  const dispatch = useDispatch();
  const [authState, setAuthState] = useState("loading");

  const attemptLogin = useCallback(() => {
    const token = localStorage.getItem("userToken");
    if (!token) {
      setAuthState("unauthenticated");
      return;
    }

    setAuthState("loading");
    dispatch(authActions.login(token)).then(() => {
      setAuthState("done");
    });
  }, [dispatch]);

  useEffect(() => {
    if (user) {
      setAuthState("authenticated");
      return;
    }

    attemptLogin();
  }, [user, attemptLogin]);

  useEffect(() => {
    if (authState === "done") {
      setAuthState(user ? "authenticated" : loginFailed ? "failed" : "unauthenticated");
    }
  }, [authState, user, loginFailed]);

  if (authState === "loading") {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="loader"></div>
      </div>
    );
  }

  if (authState === "failed") {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen gap-4">
        <p>Unable to connect to the server. Please try again.</p>
        <button
          onClick={attemptLogin}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return authState === "authenticated" ? <Outlet /> : <Navigate to="/login" />;
};

export default PrivateRoute;
