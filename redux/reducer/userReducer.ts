// this the userreducer part here all the details are stored from api response and reused.

const initialState = {
  loading: false,
  error: null,
  userData: null,
};

const userReducer = (
  state = initialState,
  action: { type: any; payload: any },
) => {
  switch (action.type) {
    case "POST_USER":
      return { ...state, loading: true, error: null };
    case "POST_USER_SUCCESS":
      console.log("action.payload", action.payload);
      return {
        ...state,
        loading: false,
        userData: action.payload,
        error: null,
      };
    case "POST_USER_FAILURE":
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
};

export default userReducer;
