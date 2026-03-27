import apiClient from "./axiosService.js";

const urlBase = '/participants/'

const participantService = {
  getAllParticipants(url = urlBase) {
    return apiClient.get(url);
  },

  createParticipant(data) {
    return apiClient.post(`${urlBase}`, data);
  },

  sendInvitationToParticipant(id, data) {
    return apiClient.post(`${urlBase}${id}/invite/`, data);
  },
};

export default participantService;