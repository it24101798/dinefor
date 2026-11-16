import { resolveMediaUrl } from "../services/api";

export function toImageUrl(value) {
  const source = typeof value === "string" ? value : value?.url || value?.secure_url || value?.path;
  if (typeof source !== "string") return "";
  const url = source.trim();
  if (/^(uploads|images)\//i.test(url)) return resolveMediaUrl(`/${url}`);
  if (/^(https?:\/\/|data:image\/|\/(?!\/))/i.test(url)) return resolveMediaUrl(url);
  return "";
}
