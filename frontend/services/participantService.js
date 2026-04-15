import apiClient from "./axiosService.js";

const urlBase = '/participants/'

const participantService = {
  getAllParticipants(url = urlBase) {
    return apiClient.get(url);
  },

  checkIsEmailAvailable(email) {
    return apiClient.get(`${urlBase}check-email/?email=${email}`);
  },

  createParticipant(data) {
    return apiClient.post(`${urlBase}`, data);
  },

  sendInvitationToParticipant(id, data) {
    return apiClient.post(`${urlBase}${id}/invite/`, data);
  },

  getParticipantInvitation(id) {
    return apiClient.get(`${urlBase}invitations/${id}/`, { public: true });
  },

  acceptParticipantInvitation(id, data) {
    return apiClient.post(`${urlBase}invitations/${id}/accept/`, data, { public: true });
  },

  suggestUsername() {
    return apiClient.get(`${urlBase}suggest-username/`, { public: true });
  }
};

export default participantService;