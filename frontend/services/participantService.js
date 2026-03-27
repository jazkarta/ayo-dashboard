import apiClient from "./axiosService.js";

const participantService = {
  getAllParticipants() {
    return apiClient.get(`/participants/`);
  },
};

export default participantService;