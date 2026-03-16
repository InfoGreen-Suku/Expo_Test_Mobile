import axios from "axios";
import { logApiEvent } from "./apiLogger";

const apiClient = axios.create({
  timeout: 15000,
});

// ✅ Request interceptor
apiClient.interceptors.request.use(
  async (config) => {
    await logApiEvent("➡️ REQUEST", {
      method: config.method?.toUpperCase(),
      url: config.url,
      headers: config.headers,
      data: config.data,
    });
    return config;
  },
  async (error) => {
    await logApiEvent("❌ REQUEST ERROR", {
      message: error.message,
      stack: error.stack,
    });
    return Promise.reject(error);
  }
);

// ✅ Response interceptor
apiClient.interceptors.response.use(
  async (response) => {
    await logApiEvent("✅ RESPONSE", {
      url: response.config.url,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data,
    });
    return response;
  },
  async (error) => {
    const config = error.config || {};
    const response = error.response || {};

    await logApiEvent("🚨 RESPONSE ERROR", {
      url: config.url,
      method: config.method?.toUpperCase(),
      status: response.status || "NO_STATUS",
      statusText: response.statusText || "NO_STATUS_TEXT",
      headers: response.headers || {},
      requestHeaders: config.headers || {},
      requestData: config.data || null,
      responseData: response.data || null,
      errorType: error.code || "UNKNOWN_ERROR",
      message: error.message,
      stack: error.stack,
    });

    return Promise.reject(error);
  }
);

export default apiClient;
