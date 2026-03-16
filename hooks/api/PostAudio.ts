import axios from "axios";
export const  PostAudio= async(formData: any,url: any)=> {
    console.log("formData",formData);
    try {
        let apiAudioUrl = await url // Assuming you're using AsyncStorage from 'react-native' to store data locally
    
      // If apiUrl is null or empty, use a fallback URL
      if (apiAudioUrl==='') {
        apiAudioUrl = 'https://infogreen.synology.me:82/api.php'; // Fallback URL
      }
        const response = await axios.post(apiAudioUrl, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
      console.log("response.data",response.data);
    return response.data
    } catch (error) {
      console.log(error);  
    }
}