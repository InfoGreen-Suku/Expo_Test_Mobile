import axios from "axios";
// this code is for post all userdetails to the api server 


export const postUserLocation = async(Data: any) => {
  console.log("data:",Data);
    try {
      const response = await axios.post('https://67386c2e4eb22e24fca7e0a5.mockapi.io/cloudbook/api/location', Data);
      // console.log(response.data);
    return response.data
    } catch (error) {
      console.log("error",error);  
    }
};

