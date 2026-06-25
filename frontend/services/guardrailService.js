import apiClient from "./axiosService.js";

const urlBase = "/chats/";

const guardrailService = {

  applyGuardrail(data) {
    return apiClient.post(`${urlBase}guardrail-rules/`, data);
  }
};

export default guardrailService;
