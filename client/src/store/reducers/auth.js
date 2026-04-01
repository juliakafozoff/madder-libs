import { SET_USER, LOGOUT, LOGIN_FAILED } from "../actions/auth";

const initialState = {
  user: null,
  loginFailed: false,
};

const userReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_USER:
      return {
        user: action.user,
        loginFailed: false,
      };
    case LOGOUT:
      return {
        user: null,
        loginFailed: false,
      };
    case LOGIN_FAILED:
      return {
        ...state,
        loginFailed: true,
      };
    default:
      return state;
  }
};

export default userReducer;
