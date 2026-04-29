import apiClient from "./axiosService.js";

const urlBase = "/chats/conversations/";

const conversationService = {
  getAllConversations(url = urlBase, search = "") {
    if (url.includes("?")) {
      return apiClient.get(url);
    }
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const queryString = params.toString();
    return apiClient.get(queryString ? `${url}?${queryString}` : url);
  },

  getConversationDetails(id, url = null) {
    if (url) {
      return apiClient.get(url.includes("?") ? url : url);
    }
    return apiClient.get(`${urlBase}${id}/details/`);
  },
};

export default conversationService;
