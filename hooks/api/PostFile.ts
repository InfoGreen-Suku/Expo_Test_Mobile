import axios from "axios";
export const  PostFile= async(formData: any,url: any)=> {
    console.log("formdata_img",url);
    try {
      let apiImageUrl = await url 
    // console.log(apiImageUrl);
      // If apiUrl is null or empty, use a fallback URL
      if (apiImageUrl==='') {
        // apiImageUrl = 'https://infogreen.synology.me:82/api.php'; 
        apiImageUrl = 'https://rk12.infogreen.in/test.php'; // Fallback URL
      }
        const response = await axios.post(apiImageUrl, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
      console.log("response.data",response.data);
    return response.data
    } catch (error) {
      console.log("error",error);  
    }
}