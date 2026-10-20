import { createFileRoute, Link } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/data/events";
import { update, useDB, logAdminAction } from "@/lib/store";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/admin/blog")({
  head: () => pageHead("Manage Blog — Chembuli FC Admin", "Manage club journal stories and drafts.", true),
  component: AdminBlog,
});

function AdminBlog() {
  const posts = [...useDB().posts].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return <div>
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="tag-label">Manage</p><h1 className="text-5xl font-bold uppercase">Blog</h1></div>
      <Button asChild><Link to="/admin/blog/$id" params={{ id: "new" }}><Plus />New post</Link></Button>
    </div>
    <div className="mt-8 divide-y divide-border border-y border-border">
      {posts.length === 0 && <p className="py-8 text-muted-foreground">No posts yet.</p>}
      {posts.map((post) => <div key={post.id} className="flex items-center gap-3 py-5">
        <Link to="/admin/blog/$id" params={{ id: post.id }} className="min-w-0 flex-1"><h2 className="break-words text-2xl font-bold uppercase hover:text-primary">{post.title}</h2><p className="mt-1 text-sm text-muted-foreground">{post.published ? "Published" : "Draft"} · {formatDate(post.updatedAt)}</p></Link>
        <Button asChild variant="ghost" size="icon"><Link to="/admin/blog/$id" params={{ id: post.id }} aria-label={`Edit ${post.title}`} title="Edit post"><Pencil /></Link></Button>
        <Button variant="ghost" size="icon" aria-label={`Delete ${post.title}`} title="Delete post" onClick={async () => {
          if (!confirm(`Delete “${post.title}”?`)) return;
          try {
            await update((db) => ({ ...db, posts: db.posts.filter((p) => p.id !== post.id) }));
            await logAdminAction("blog.delete", "post", post.id, `Deleted blog post "${post.title}"`, { id: post.id, title: post.title }).catch(() => {});
            toast.success("Post deleted");
          } catch (error) { toast.error((error as Error).message); }
        }}><Trash2 className="text-destructive" /></Button>
      </div>)}
    </div>
  </div>;
}