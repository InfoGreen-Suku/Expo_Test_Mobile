import axios from "axios";
export const  PostSharedFile= async(formData: any)=> {
    // console.log(formData);
    try {
        let apiSharedfileUrl = 'https://infogreen.synology.me:82/api.php'; // Fallback URL
        const response = await axios.post(apiSharedfileUrl, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
    //   console.log(response.data);
    return response.data
    } catch (error) {
      console.log("error",error);  
    }
}