import apiClient from "./axiosService.js";

const urlBase = '/participants/'

const participantService = {
  getAllParticipants(url = urlBase) {
    return apiClient.get(url);
  },

  createParticipant(url = urlBase, data) {
    return apiClient.post(url, data);
  },
};

export default participantService;