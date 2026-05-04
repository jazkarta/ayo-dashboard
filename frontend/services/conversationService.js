import apiClient from "./axiosService.js";

const urlBase = "/chats/conversations/";

const conversationService = {
  getAllConversations(url = urlBase, search = "", filters = {}) {
    if (url.includes("?")) {
      return apiClient.get(url);
    }
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filters.model_name) params.set("model_name", filters.model_name);
    if (filters.participant_email) params.set("participant_email", filters.participant_email);
    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to) params.set("date_to", filters.date_to);
    const queryString = params.toString();
    return apiClient.get(queryString ? `${url}?${queryString}` : url);
  },

  getConversationDetails(id, url = null) {
    if (url) {
      return apiClient.get(url.includes("?") ? url : url);
    }
    return apiClient.get(`${urlBase}${id}/details/`);
  },

  exportConversation(id) {
    return apiClient.get(`${urlBase}${id}/export/`, { responseType: "blob" });
  },
};

export default conversationService;
