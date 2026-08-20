import { useEffect } from "react";

const SITE_NAME = "DineFor";
const SITE_URL = "https://dinefor.com";

function upsertMeta(selector, attrs) {
  let node = document.head.querySelector(selector);
  if (!node) {
    node = document.createElement("meta");
    document.head.appendChild(node);
  }
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
}

function upsertLink(rel, href) {
  let node = document.head.querySelector(`link[rel="${rel}"]`);
  if (!node) {
    node = document.createElement("link");
    node.rel = rel;
    document.head.appendChild(node);
  }
  node.href = href;
}

export default function SEO({
  title,
  description = "Discover and reserve verified hotel buffets and dining experiences across Sri Lanka with DineFor.",
  canonicalPath,
  image,
  type = "website",
  noindex = false,
  structuredData,
}) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | Discover & Reserve Buffets in Sri Lanka`;
    const canonical = `${SITE_URL}${canonicalPath || window.location.pathname}`;
    const shareImage = image || `${SITE_URL}/og-default.jpg`;

    document.title = fullTitle;
    upsertMeta('meta[name="description"]', { name: "description", content: description });
    upsertMeta('meta[name="robots"]', { name: "robots", content: noindex ? "noindex,nofollow" : "index,follow,max-image-preview:large" });
    upsertMeta('meta[property="og:title"]', { property: "og:title", content: fullTitle });
    upsertMeta('meta[property="og:description"]', { property: "og:description", content: description });
    upsertMeta('meta[property="og:type"]', { property: "og:type", content: type });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: canonical });
    upsertMeta('meta[property="og:image"]', { property: "og:image", content: shareImage });
    upsertMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
    upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: fullTitle });
    upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: description });
    upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: shareImage });
    upsertLink("canonical", canonical);

    const id = "dinefor-structured-data";
    let script = document.getElementById(id);
    if (structuredData) {
      if (!script) {
        script = document.createElement("script");
        script.id = id;
        script.type = "application/ld+json";
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(structuredData);
    } else if (script) {
      script.remove();
    }
  }, [title, description, canonicalPath, image, type, noindex, structuredData]);

  return null;
}
