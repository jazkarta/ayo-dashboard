import apiClient from "./axiosService.js";

const urlBase = "/chats/conversations/";

const conversationService = {
  getAllConversations(url = urlBase, search = "", filters = {}) {
    if (url.includes("?")) {
      return apiClient.get(url);
    }
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filters.participant_username) params.set("participant_username", filters.participant_username);
    if (filters.turns_min) params.set("turns_min", filters.turns_min);
    if (filters.turns_max) params.set("turns_max", filters.turns_max);
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

  bulkExportConversations(search = "", filters = {}) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filters.participant_username) params.set("participant_username", filters.participant_username);
    if (filters.turns_min) params.set("turns_min", filters.turns_min);
    if (filters.turns_max) params.set("turns_max", filters.turns_max);
    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to) params.set("date_to", filters.date_to);
    const queryString = params.toString();
    const url = queryString ? `${urlBase}export/?${queryString}` : `${urlBase}export/`;
    return apiClient.get(url, { responseType: "blob" });
  },
};

export default conversationService;
