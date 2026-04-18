// Action Types
export const POST_USER = "POST_USER";
export const POST_USER_SUCCESS = "POST_USER_SUCCESS";
export const POST_USER_FAILURE = "POST_USER_FAILURE";
export const POST_IMAGE_SUCCESS = "POST_IMAGE_SUCCESS";
export const POST_AUDIO_SUCCESS = "POST_AUDIO_SUCCESS";
export const POST_SharedFile_SUCCESS = "POST_SharedFile_SUCCESS";

// Action Creators
export const postUser = () => ({
  type: POST_USER,
});

export const postUserSuccess = (data: any) => ({
  type: POST_USER_SUCCESS,
  payload: data,
});

export const postUserFailure = (error: any) => ({
  type: POST_USER_FAILURE,
  payload: error,
});
