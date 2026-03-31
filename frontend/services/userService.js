import apiClient from "./axiosService.js";

const urlBase = '/users/'

const userService = {
  getUserDetails() {
    return apiClient.get(`${urlBase}me/`);
  },
};

export default userService;
