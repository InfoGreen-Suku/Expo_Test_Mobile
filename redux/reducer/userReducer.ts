// this the userreducer part here all the details are stored from api response and reused.


const initialState = {
    loading: false,
    error: null,
    userData: null,
    Image_URL: [],
    Audio_URL:[],
    SharedFile_URL:[],
  };
  
  const userReducer = (state = initialState, action: { type: any; payload: any; }) => {
    switch (action.type) {
      case 'POST_USER':
        return { ...state, loading: true, error: null };
      case 'POST_USER_SUCCESS':
        console.log("action.payload",action.payload);
        return { ...state, loading: false, userData: action.payload, error: null };
      case 'POST_USER_FAILURE':
        return { ...state, loading: false, error: action.payload };
      case 'POST_IMAGE_SUCCESS':
        return { ...state, loading: false, Image_URL: [...state.Image_URL, action.payload], error: null };
      case 'POST_AUDIO_SUCCESS':
        return { ...state, loading: false, Audio_URL: [...state.Audio_URL, action.payload], error: null };
      case 'POST_SharedFile_SUCCESS':
        return { ...state, loading: false, SharedFile_URL: [...state.SharedFile_URL, action.payload], error: null };
      default:
        return state;
    }
  };
  
  export default userReducer;
  