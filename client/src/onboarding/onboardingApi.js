import api from "../services/api";

export const route = "/hotel-onboarding";
export const problem = error => error.response?.data?.message || "The request could not be completed. Try again.";

export async function downloadEvidence(path, file, headers) {
  const { data } = await api.get(route + path, { responseType: "blob", headers });
  const url = URL.createObjectURL(data);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
