import apiClient from "./axiosService.js";

const urlBase = "/chats/";

const guardrailService = {

  applyGuardrail(data) {
    return apiClient.post(`${urlBase}guardrail-rules/`, data);
  },
  getGuardrailRules() {
    return apiClient.get(`${urlBase}guardrail-rules/`);
  },
  updateGuardrailRule(id, data) {
    return apiClient.put(`${urlBase}guardrail-rules/${id}/`, data);
  },
  deleteGuardrailRule(id) {
    return apiClient.delete(`${urlBase}guardrail-rules/${id}/`);
  }
};

export default guardrailService;
