import apiClient from "./axiosService.js";

const urlBase = '/researchers/'

const researcherService = {
  getAllResearchers(url = urlBase, search = "", ordering = "") {
    if (url.includes('?')) {
      return apiClient.get(url);
    }
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (ordering) params.set('ordering', ordering);
    const queryString = params.toString();
    return apiClient.get(queryString ? `${url}?${queryString}` : url);
  },

  createResearcher(data) {
    return apiClient.post(`${urlBase}`, data);
  },

  deleteResearcher(id) {
    return apiClient.delete(`${urlBase}${id}/`);
  },

  editResearcher(id, data) {
    return apiClient.put(`${urlBase}${id}/`, data);
  }
};

export default researcherService;