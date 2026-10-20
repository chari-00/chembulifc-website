import { uid } from "@/data/events";

export type BlogBlock = { id: string; type: "heading" | "text" | "image"; content: string; caption?: string };
export interface BlogPost {
  id: string;
  title: string;
  blocks: BlogBlock[];
  published: boolean;
  createdAt: string;
  updatedAt: string;
}
export function blankPost(): BlogPost {
  const now = new Date().toISOString();
  return { id: uid(), title: "", blocks: [], published: false, createdAt: now, updatedAt: now };
}
export function publicPosts(posts: BlogPost[]) {
  return posts.filter((post) => post.published).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}