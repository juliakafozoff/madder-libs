const initialState = {
  story: null,
  resultStory: [],
};

const storyReducer = (state = initialState, action) => {
  switch (action.type) {
    case "SET_STORY":
      return {
        ...state,
        story: action.story,
      };
    case "SET_RESULT_STORY":
      return {
        ...state,
        resultStory: action.story,
      };
    default:
      return state;
  }
};

export default storyReducer;
