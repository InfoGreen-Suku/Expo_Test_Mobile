import axios from "axios";
// this code is for post all userdetails to the api server 


export const postUserDetails = async(userData: any) => {
  console.log("Before userData:",userData);
    try {
      const response = await axios.post('https://infogreen.in/api/infogreen_app_user_details.php', userData);
      console.log("response",response.data);
    return response.data
    } catch (error) {
      console.log(error);  
    }
};

