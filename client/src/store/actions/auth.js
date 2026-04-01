import axios from "../../axios";

export const SET_USER = "SET_USER";

export const setUser = (user) => {
  return {
    type: SET_USER,
    user: user,
  };
};

export const LOGOUT = "LOGOUT";

export const login = (token) => {
  return async (dispatch) => {
    try {
      const res = await axios.get("/user/get/user/data", {
        headers: {
          authorization: token,
        },
      });
      dispatch(setUser(res.data.user));
    } catch (err) {
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        dispatch(autoLogout());
      }
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
      dispatch(userLogout());
    } catch (err) {
      throw new Error(err);
    }
  };
};
