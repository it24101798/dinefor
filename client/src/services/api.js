import axios from "axios";

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

const SERVER_BASE = API_BASE.replace(/\/api\/?$/i, "");

const normalizeRequestUrl = (url = "") => {
  if (!url || /^https?:\/\//i.test(url)) {
    return url;
  }

  let normalized = url.trim();

  // Prevent https://api.dinefor.com/api/api/... URLs.
  normalized = normalized.replace(/^\/?api(?=\/)/i, "");
  normalized = normalized.replace(/^\/+/, "");

  return `/${normalized}`;
};

const normalizeMediaUrl = (value) => {
  if (typeof value !== "string") {
    return value;
  }

  const localhostUploadPattern =
    /^https?:\/\/(?:localhost|127\.0\.0\.1):5000(\/uploads\/.*)$/i;

  const localhostMatch = value.match(localhostUploadPattern);

  if (localhostMatch) {
    return `${SERVER_BASE}${localhostMatch[1]}`;
  }

  if (value.startsWith("/uploads/")) {
    return `${SERVER_BASE}${value}`;
  }

  return value;
};

const normalizeResponseData = (data) => {
  if (typeof data === "string") {
    return normalizeMediaUrl(data);
  }

  if (Array.isArray(data)) {
    return data.map(normalizeResponseData);
  }

  if (data && typeof data === "object") {
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [
        key,
        normalizeResponseData(value),
      ])
    );
  }

  return data;
};

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

api.interceptors.request.use(
  (config) => {
    config.url = normalizeRequestUrl(config.url);

    const storedUser = localStorage.getItem("dineforUser");

    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);

        if (user?.token) {
          config.headers.Authorization = `Bearer ${user.token}`;
        }
      } catch {
        localStorage.removeItem("dineforUser");
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    response.data = normalizeResponseData(response.data);
    return response;
  },
  (error) => {
    if (error.response?.data) {
      error.response.data = normalizeResponseData(error.response.data);
    }

    if (error.response?.status === 401) {
      localStorage.removeItem("dineforUser");

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export const resolveMediaUrl = normalizeMediaUrl;
export const getServerBaseUrl = () => SERVER_BASE;

export default api;