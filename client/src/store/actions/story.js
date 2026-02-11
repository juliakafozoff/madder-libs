export const setStory = (story) => {
  return {
    type: "SET_STORY",
    story,
  };
};

export const setResultStory = (story) => {
  return {
    type: "SET_RESULT_STORY",
    story,
  };
};
