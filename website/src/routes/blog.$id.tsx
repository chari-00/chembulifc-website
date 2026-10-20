import { createFileRoute, Link } from "@tanstack/react-router";
import { formatDate } from "@/data/events";
import { useDB } from "@/lib/store";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/blog/$id")({
  head: ({ params }) => pageHead(`Club story ${params.id} — Chembuli FC`, "Read the latest stories and updates from the Chembuli FC club journal."),
  component: BlogStory,
});

function BlogStory() {
  const { id } = Route.useParams();
  const post = useDB().posts.find((p) => p.id === id && p.published);
  if (!post) return <section className="mx-auto min-h-[65vh] max-w-3xl px-5 py-20"><h1 className="text-4xl font-bold uppercase">Story unavailable</h1><Link to="/blog" className="mt-6 inline-block text-primary">← Blog</Link></section>;
  return (
    <article className="mx-auto max-w-3xl px-5 py-20">
      <Link to="/blog" className="text-sm uppercase tracking-widest text-muted-foreground hover:text-primary">← Club journal</Link>
      <p className="tag-label mt-10">{formatDate(post.createdAt)}</p>
      <h1 className="mt-3 break-words text-5xl font-bold uppercase leading-tight md:text-6xl">{post.title}</h1>
      <div className="mt-12 space-y-7">
        {post.blocks.map((block) => {
          if (!block.content.trim()) return null;
          if (block.type === "heading") return <h2 key={block.id} className="break-words pt-4 text-3xl font-bold">{block.content}</h2>;
          if (block.type === "text") return <p key={block.id} className="whitespace-pre-wrap break-words text-base leading-8">{block.content}</p>;
          return <figure key={block.id}><img src={block.content} alt={block.caption ?? ""} className="h-auto w-full" />{block.caption && <figcaption className="mt-3 break-words text-center text-sm text-muted-foreground">{block.caption}</figcaption>}</figure>;
        })}
      </div>
    </article>
  );
}