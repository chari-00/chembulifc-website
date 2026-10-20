export function pageHead(title: string, description: string, admin = false) {
  return { meta: [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    ...(admin ? [{ name: "robots", content: "noindex" }] : []),
  ] };
}