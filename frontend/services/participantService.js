import apiClient from "./axiosService.js";

const urlBase = '/participants/'

const participantService = {
  getAllParticipants(url = urlBase) {
    return apiClient.get(url);
  },
};

export default participantService;