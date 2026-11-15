export const DEFAULT_LEGACY_API_URL = "https://crimemap-fastapi.onrender.com";

export function getLegacyApiUrl(configuredUrl, isProduction) {
  const value = configuredUrl?.trim();
  return (value || (isProduction ? DEFAULT_LEGACY_API_URL : "")).replace(/\/+$/, "");
}

export function getUploadSuccessMessage(result) {
  const message = typeof result?.status === "string" ? result.status.trim() : "";
  return message || "CSV processed successfully.";
}

export function getUploadErrorMessage(error) {
  const status = error?.response?.status;
  const body = error?.response?.data;
  const detail = body?.detail || body?.error?.message || body?.message;

  if (status === 401) return "Your session is missing or expired. Sign in again and retry the upload.";
  if (status === 403) return "Only an administrator can upload CSV files.";
  if (status === 413) return "The CSV exceeds the 10 MB upload limit.";
  if (status === 400 && typeof detail === "string") return detail;
  if (status === 503) return "The upload or authentication service is temporarily unavailable. Try again shortly.";
  if (status) return typeof detail === "string" ? detail : `The CSV upload failed (HTTP ${status}).`;
  return "Could not reach the CSV service. Check that FastAPI is deployed and allows the Vercel site, then try again.";
}
