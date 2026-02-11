import React, { useEffect, useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import * as authActions from "../store/actions/auth";

const PrivateRoute = () => {
  const user = useSelector((state) => {
    return state.auth.user;
  });
  console.log(user);
  const dispatch = useDispatch();
  const [isToken, setIsToken] = useState(false);

  useEffect(() => {
    if (!user) {
      let currentUser = localStorage.getItem("userToken");
      if (currentUser) {
        dispatch(authActions.login(currentUser));
      }
    }
    setTimeout(() => {
      setIsToken(true);
    }, 1000);

    return () => {
      setIsToken(false);
    };
  }, [user, dispatch]);
  if (isToken) {
    return user ? <Outlet /> : <Navigate to="/login" />;
  }
  return (
    <div className="flex justify-center items-center min-h-screen">
      <div class="loader"></div>
    </div>
  );
};

export default PrivateRoute;
