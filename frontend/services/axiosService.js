"use client";
import axios from "axios";
// import { toast } from "react-hot-toast";
// import { jwtDecode } from "jwt-decode";

const baseURL = process.env.NEXT_PUBLIC_API_URL;

// const isTokenExpired = (token) => {
//   if (!token) return true;
//   const decodedToken = jwtDecode(token);
//   const currentTime = new Date().getTime() / 1000;
//   return decodedToken.exp < currentTime;
// };

// const getNewToken = async (refreshToken) => {
//   try {
//     const response = await axios.post(`${baseURL}/auth/token/refresh/`, {
//       refresh: refreshToken,
//     });
//     const newAuthToken = response.data.access;
//     localStorage.setItem("access_token", newAuthToken);
//     return newAuthToken;
//   } catch (error) {
//     toast.error("Something went wrong. Please login again");
//     return null;
//   }
// };

// const logOutUser = () => {
//   setTimeout(() => {
//     if (typeof window !== "undefined") {
//       localStorage.removeItem("access_token");
//       localStorage.removeItem("refresh_token");
//       localStorage.removeItem("user");
//       localStorage.removeItem("isAuthenticated");
//     }
//     window.location = "/login";
//   }, 1500);
//   toast.error("Session has exipred!!");
// };

// const getAuthToken = async () => {
//   const authToken = localStorage.getItem("access_token");
//   const refreshToken = localStorage.getItem("refresh_token");

//   if (isTokenExpired(authToken)) {
//     if (refreshToken) {
//       const newAuthToken = await getNewToken(refreshToken);
//       if (newAuthToken) {
//         return newAuthToken;
//       }
//     }
//   } else {
//     return authToken;
//   }

//   return null;
// };

const ApiClient = () => {
  const defaultOptions = {
    baseURL: baseURL,
    headers: { Accept: "application/json" },
  };

  const instance = axios.create(defaultOptions);

  instance.interceptors.request.use(async (request) => {
    const requireToken = request.public !== undefined ? !request.public : true;

    // Sometimes in public API we may need to pass the token
    // Use sendToken: True to send token with request even though it may be public
    const sendToken =
      request.sendToken !== undefined ? request.sendToken : true;

    const contentType = request.contentType;
    if (contentType) {
      request.headers["Content-Type"] = contentType;
    } else {
      if (!(request.data instanceof FormData)) {
        request.headers["Content-Type"] = "application/json";
      }
    }

    // if (requireToken || sendToken) {
    //   const authToken = await getAuthToken();
    //   if (authToken) {
    //     request.headers.Authorization = `Bearer ${authToken}`;
    //   } else {
    //     if (requireToken) {
    //       logOutUser();
    //     }
    //   }
    // }
    return request;
  });

  return instance;
};

export default ApiClient();