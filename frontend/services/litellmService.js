import axios from "axios";

const litellmClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_LITELLM_URL,
  headers: {
    Accept: "application/json",
    Authorization: `Bearer ${process.env.NEXT_PUBLIC_LITELLM_KEY}`,
  },
});

const litellmService = {
  getGuardrails() {
    return litellmClient.get("/v2/guardrails/list");
  },
};

export default litellmService;
