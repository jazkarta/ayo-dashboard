import apiClient from "./axiosService.js";

const urlBase = '/participants/'

const participantService = {
  getAllParticipants(url = urlBase, search = "", ordering = "", isActive = "", cohortId = "") {
    if (url.includes('?')) {
      return apiClient.get(url);
    }
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (ordering) params.set('ordering', ordering);
    if (isActive !== "") params.set('is_active', isActive);
    if (cohortId) params.set('cohort_id', cohortId);
    const queryString = params.toString();
    return apiClient.get(queryString ? `${url}?${queryString}` : url);
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

  suggestUsername(count = 6) {
    return apiClient.get(`${urlBase}suggest-username/?count=${count}`, { public: true });
  },

  deleteParticipant(id) {
    return apiClient.delete(`${urlBase}${id}/`);
  },

  editParticipant(id, data) {
    return apiClient.patch(`${urlBase}${id}/`, data);
  },
  resendInvitation(id) {
    return apiClient.post(`${urlBase}${id}/resend-invite/`);
  }
};

export default participantService;