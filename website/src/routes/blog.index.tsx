import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { publicPosts } from "@/data/blog";
import { formatDate } from "@/data/events";
import { useDB } from "@/lib/store";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/blog/")({
  head: () => pageHead("Blog — Chembuli FC", "Stories, club news and match notes from Chembuli FC."),
  component: Blog,
});

function Blog() {
  const posts = publicPosts(useDB().posts);
  return (
    <section className="mx-auto min-h-[65vh] max-w-7xl px-5 py-20">
      <p className="tag-label">Club journal</p>
      <h1 className="mt-3 text-6xl font-bold uppercase md:text-8xl">Blog</h1>
      <div className="mt-12 grid gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => {
          const image = post.blocks.find((block) => block.type === "image" && block.content);
          const excerpt = post.blocks.find((block) => block.type === "text");
          return (
            <Link key={post.id} to="/blog/$id" params={{ id: post.id }} className="group min-w-0 border-t border-border pt-5">
              {image && <img src={image.content} alt={image.caption ?? ""} className="mb-5 aspect-[4/3] w-full object-cover" />}
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{formatDate(post.createdAt)}</p>
              <div className="mt-3 flex items-start justify-between gap-4">
                <h2 className="break-words text-3xl font-bold uppercase group-hover:text-primary">{post.title}</h2>
                <ArrowUpRight className="mt-1 size-5 shrink-0 text-primary" />
              </div>
              {excerpt && <p className="mt-3 line-clamp-3 break-words text-muted-foreground">{excerpt.content}</p>}
            </Link>
          );
        })}
      </div>
      {posts.length === 0 && <p className="border-t border-border py-8 text-muted-foreground">No stories published yet.</p>}
    </section>
  );
}