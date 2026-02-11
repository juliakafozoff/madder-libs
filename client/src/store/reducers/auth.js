import { SET_USER, LOGOUT } from "../actions/auth";

const initialState = {
  user: null,
};

const userReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_USER:
      return {
        user: action.user,
      };
    case LOGOUT:
      return {
        user: null,
      };
    default:
      //default case will be reached when the app starts and redux store is initialized.
      return state;
  }
};

export default userReducer;
