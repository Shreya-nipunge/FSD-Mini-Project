import axios from "axios";

const trimSlash = (value = "") => value.replace(/\/+$/, "");
const API_BASE_URL = `${trimSlash(import.meta.env.VITE_API_URL || "")}/api`;
const TOKEN_KEY = "token";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: { Accept: "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const token = window.localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestPath = error.config?.url || "";
    if (error.response?.status === 401 && !requestPath.includes("/auth/login") && !requestPath.includes("/auth/register")) {
      window.localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new CustomEvent("crimemap:unauthorized"));
    }
    return Promise.reject(error);
  },
);

export function getApiErrorMessage(error, fallback = "The request could not be completed.") {
  const body = error?.response?.data;
  return body?.error?.message || body?.detail || body?.message || error?.message || fallback;
}

const dataOf = (request) => request.then((response) => response.data);

export const registerAccount = (name, email, password) => dataOf(apiClient.post("/auth/register", { name, email, password }));
export const loginAccount = (email, password) => dataOf(apiClient.post("/auth/login", { email, password }));
export const getCurrentUser = () => dataOf(apiClient.get("/auth/me"));

// Compatibility names used by existing login/register screens.
export const loginUser = (email, password) => loginAccount(email, password);
export const loginAdmin = (email, password) => loginAccount(email, password);
export const registerUser = (email, password, name) => registerAccount(name, email, password);
export const registerAdmin = (email, password, name) => dataOf(apiClient.post("/register-admin", { name, email, password }));

export const getBenchmarks = () => dataOf(apiClient.get("/analytics/benchmarks"));
export const getCrimes = (filters = {}) => {
  const params = {};
  for (const key of ["state", "region", "crime_type", "gender", "year", "view_mode"]) {
    if (filters[key] !== undefined && filters[key] !== "") params[key] = filters[key];
  }
  return dataOf(apiClient.get("/crimes", { params }));
};
export const getSummary = (state = "Maharashtra", year = null) => dataOf(apiClient.get("/summary", { params: { state, ...(year ? { year } : {}) } }));
export const getByType = (state = "Maharashtra", year = null) => dataOf(apiClient.get("/by-type", { params: { state, ...(year ? { year } : {}) } }));
export const getTrend = (state = "Maharashtra") => dataOf(apiClient.get("/trend", { params: { state } }));
export const getHotspots = (state = "Maharashtra", year = null) => dataOf(apiClient.get("/hotspots", { params: { state, ...(year ? { year } : {}) } }));
export const getSafetyScore = (district, state = "Maharashtra") => dataOf(apiClient.get("/safety-score", { params: { district, state } }));
export const getAdminInsights = (state = "Maharashtra", year = null) => dataOf(apiClient.get("/admin/insights", { params: { state, ...(year ? { year } : {}) } }));
export const getInsights = (state = "all") => dataOf(apiClient.get("/analytics/insights", { params: { state } }));
export const getStates = () => dataOf(apiClient.get("/states"));
export const getNews = (query = "crime India") => dataOf(apiClient.get("/news", { params: { q: query } }));

export const submitComplaint = (data) => dataOf(apiClient.post("/reports", data));
export const getComplaints = (state = null, status = null, includeRejected = false) => dataOf(apiClient.get("/reports", {
  params: { ...(state ? { state } : {}), ...(status ? { status } : {}), ...(includeRejected ? { include_rejected: "true" } : {}) },
}));
export const getAdminComplaints = () => getComplaints(null, null, true);
export const getMyComplaints = () => dataOf(apiClient.get("/reports/mine"));
export const getReport = (id) => dataOf(apiClient.get(`/reports/${encodeURIComponent(id)}`));
export const updateReport = (id, changes) => dataOf(apiClient.patch(`/reports/${encodeURIComponent(id)}`, changes));
export const deleteReport = (id) => dataOf(apiClient.delete(`/reports/${encodeURIComponent(id)}`));
export const getReportEvidence = (id) => dataOf(apiClient.get(`/reports/${encodeURIComponent(id)}/evidence`, { responseType: "blob" }));

export const updateComplaintStatus = (id, status = "VERIFIED", reason = null) => {
  const action = status === "UNDER_REVIEW" ? "review" : ["REJECTED", "rejected"].includes(status) ? "reject" : "verify";
  const payload = action === "reject" ? { reason: reason || "Rejected by Admin" } : {};
  return dataOf(apiClient.patch(`/reports/${encodeURIComponent(id)}/${action}`, payload));
};

// CSV ingestion remains on the legacy FastAPI service. During Vite development,
// /api/upload-csv has a dedicated proxy; production must configure this URL.
export const uploadDataset = async (file, state) => {
  const legacyUrl = trimSlash(import.meta.env.VITE_LEGACY_API_URL || "");
  if (import.meta.env.PROD && !legacyUrl) {
    throw new Error("CSV upload still requires the legacy FastAPI service. Configure VITE_LEGACY_API_URL.");
  }
  const formData = new FormData();
  formData.append("file", file);
  formData.append("state", state);
  const response = await axios.post(`${legacyUrl}/api/upload-csv`, formData, {
    timeout: 120000,
    headers: { Authorization: `Bearer ${window.localStorage.getItem(TOKEN_KEY) || ""}` },
  });
  return response.data;
};
