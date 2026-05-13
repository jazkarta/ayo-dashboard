import apiClient from "./axiosService.js";

const urlBase = "/cohorts/";

const cohortService = {
  getAllCohorts(url = urlBase, search = "", ordering = "") {
    if (url.includes("?")) {
      return apiClient.get(url);
    }
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (ordering) params.set("ordering", ordering);
    const queryString = params.toString();
    return apiClient.get(queryString ? `${url}?${queryString}` : url);
  },

  getCohort(id) {
    return apiClient.get(`${urlBase}${id}/`);
  },

  createCohort(data) {
    return apiClient.post(urlBase, data);
  },

  updateCohort(id, data) {
    return apiClient.put(`${urlBase}${id}/`, data);
  },

  patchCohort(id, data) {
    return apiClient.patch(`${urlBase}${id}/`, data);
  },

  deleteCohort(id) {
    return apiClient.delete(`${urlBase}${id}/`);
  },
};

export default cohortService;
