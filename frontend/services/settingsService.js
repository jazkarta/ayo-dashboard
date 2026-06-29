import apiClient from "./axiosService.js";

const urlBase = "/configurations/";

const settingsService = {
  getEmailConfigurations() {
    return apiClient.get(`${urlBase}email-configurations/`);
  },

  createEmailConfiguration(data) {
    return apiClient.post(`${urlBase}email-configurations/`, data);
  },

  updateEmailConfiguration(id, data) {
    return apiClient.patch(`${urlBase}email-configurations/${id}/`, data);
  },

  activateEmailConfiguration(id) {
    return apiClient.post(`${urlBase}email-configurations/${id}/activate/`);
  },

  deleteEmailConfiguration(id) {
    return apiClient.delete(`${urlBase}email-configurations/${id}/`);
  },

  sendTestEmail(id, data) {
    return apiClient.post(`${urlBase}email-configurations/${id}/send-test-email/`, data);
  },
};

export default settingsService;
