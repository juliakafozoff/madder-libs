import axios from "../../axios";
import { signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "../../services/firebase";

export const SET_USER = "SET_USER";

export const setUser = (user) => {
  return {
    type: SET_USER,
    user: user,
  };
};

export const LOGOUT = "LOGOUT";

export const LOGIN_FAILED = "LOGIN_FAILED";

export const loginFailed = () => {
  return {
    type: LOGIN_FAILED,
  };
};

const MAX_RETRIES = 3;
const BACKOFF_DELAYS = [1000, 3000, 9000];

export const login = (token) => {
  return async (dispatch) => {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res = await axios.get("/user/get/user/data", {
          headers: {
            authorization: token,
          },
        });
        dispatch(setUser(res.data.user));
        return;
      } catch (err) {
        if (err.response && (err.response.status === 401 || err.response.status === 403)) {
          dispatch(autoLogout());
          return;
        }

        if (attempt < MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, BACKOFF_DELAYS[attempt]));
        } else {
          dispatch(loginFailed());
        }
      }
    }
  };
};

export const loginWithFirebaseToken = (firebaseIdToken) => {
  return async (dispatch) => {
    try {
      const res = await axios.post("/auth/firebase", { firebaseToken: firebaseIdToken });
      const jwt = res.data.token;
      localStorage.setItem("userToken", jwt);
      await dispatch(login(jwt));
    } catch (err) {
      console.error("Firebase login error:", err);
      dispatch(loginFailed());
    }
  };
};

export const userLogout = () => {
  return {
    type: LOGOUT,
  };
};

export const autoLogout = () => {
  return async (dispatch) => {
    try {
      localStorage.removeItem("userToken");
      if (auth) {
        await firebaseSignOut(auth);
      }
      dispatch(userLogout());
    } catch (err) {
      throw new Error(err);
    }
  };
};
