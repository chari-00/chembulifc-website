import { describe, expect, it } from "vitest";
import { blankPost, publicPosts } from "@/data/blog";

describe("blog publishing", () => {
  it("keeps admin drafts out of the public blog", () => {
    const draft = { ...blankPost(), id: "draft", title: "Draft" };
    const published = { ...blankPost(), id: "published", title: "Club news", published: true };
    expect(publicPosts([draft, published]).map((p) => p.id)).toEqual(["published"]);
  });
});