import React, { useEffect, useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import * as authActions from "../store/actions/auth";

const PrivateRoute = () => {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (user) {
      setAuthChecked(true);
      return;
    }

    const token = localStorage.getItem("userToken");
    if (!token) {
      setAuthChecked(true);
      return;
    }

    let cancelled = false;
    dispatch(authActions.login(token)).then(() => {
      if (!cancelled) setAuthChecked(true);
    });

    return () => { cancelled = true; };
  }, [user, dispatch]);

  if (!authChecked) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="loader"></div>
      </div>
    );
  }

  return user ? <Outlet /> : <Navigate to="/login" />;
};

export default PrivateRoute;
