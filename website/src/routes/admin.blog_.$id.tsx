import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, Heading2, ImagePlus, Save, Trash2, Type } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { blankPost, type BlogBlock, type BlogPost } from "@/data/blog";
import { uid } from "@/data/events";
import { fileToImage, update, useDB, logAdminAction, type AdminAction } from "@/lib/store";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/admin/blog_/$id")({
  head: () => pageHead("Edit Blog Post — Chembuli FC Admin", "Write and maintain Chembuli FC club stories.", true),
  component: BlogEditorPage,
});

function BlogEditorPage() {
  const { id } = Route.useParams();
  const existing = useDB().posts.find((post) => post.id === id);
  if (id !== "new" && !existing) return <div>Post not found. <Link to="/admin/blog" className="text-primary">All posts</Link></div>;
  return <BlogEditor key={id} initial={existing ?? blankPost()} isNew={id === "new"} />;
}

function BlogEditor({ initial, isNew }: { initial: BlogPost; isNew: boolean }) {
  const [post, setPost] = useState(initial);
  const [busy, setBusy] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const patchBlock = (id: string, patch: Partial<BlogBlock>) => setPost((p) => ({ ...p, blocks: p.blocks.map((b) => b.id === id ? { ...b, ...patch } : b) }));
  function add(type: "heading" | "text") {
    setPost((p) => ({ ...p, blocks: [...p.blocks, { id: uid(), type, content: "" }] }));
  }
  function move(index: number, offset: number) {
    setPost((p) => {
      const blocks = [...p.blocks];
      const target = index + offset;
      const current = blocks[index];
      const other = blocks[target];
      if (!current || !other) return p;
      blocks[index] = other;
      blocks[target] = current;
      return { ...p, blocks };
    });
  }
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    try {
      const blocks: BlogBlock[] = await Promise.all([...files].map(async (file) => ({ id: uid(), type: "image" as const, content: (await fileToImage(file)).src, caption: "" })));
      setPost((p) => ({ ...p, blocks: [...p.blocks, ...blocks] }));
    } catch (error) { toast.error((error as Error).message); }
    setBusy(false);
  }
  async function save() {
    if (!post.title.trim()) return toast.error("Add a post title.");
    if (post.published && !post.blocks.some((block) => block.content.trim())) return toast.error("Add content before publishing.");
    const saved = { ...post, title: post.title.trim(), updatedAt: new Date().toISOString() };
    setBusy(true);
    try {
      await update((db) => ({ ...db, posts: isNew ? [...db.posts, saved] : db.posts.map((p) => p.id === post.id ? saved : p) }));
      
      let action: AdminAction = isNew ? "blog.create" : "blog.update";
      if (!isNew && !initial.published && saved.published) {
        action = "blog.publish";
      } else if (!isNew && initial.published && !saved.published) {
        action = "blog.unpublish";
      }

      await logAdminAction(
        action,
        "post",
        saved.id,
        isNew
          ? `Created blog post "${saved.title}" (${saved.published ? "Published" : "Draft"})`
          : action === "blog.publish"
          ? `Published blog post "${saved.title}"`
          : action === "blog.unpublish"
          ? `Unpublished blog post "${saved.title}"`
          : `Updated blog post "${saved.title}"`,
        { title: saved.title, published: saved.published }
      ).catch(() => {});

      toast.success(saved.published ? "Post published" : "Draft saved");
      if (isNew) navigate({ to: "/admin/blog/$id", params: { id: saved.id }, replace: true });
    } catch (error) { toast.error((error as Error).message); }
    finally { setBusy(false); }
    return undefined;
  }
  return <div className="mx-auto max-w-4xl">
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
      <Link to="/admin/blog" className="text-sm text-muted-foreground hover:text-primary">← All posts</Link>
      <div className="flex flex-wrap items-center gap-4">
        {!isNew && post.published && <Button asChild variant="ghost"><Link to="/blog/$id" params={{ id: post.id }} target="_blank">View post ↗</Link></Button>}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-primary" checked={post.published} onChange={(e) => setPost((p) => ({ ...p, published: e.target.checked }))} />Published</label>
        <Button onClick={save} disabled={busy}><Save />Save post</Button>
      </div>
    </div>
    <div className="py-10">
      <p className="tag-label">Club journal</p>
      <textarea aria-label="Post title" placeholder="Untitled" rows={2} maxLength={200} value={post.title} onChange={(e) => setPost((p) => ({ ...p, title: e.target.value }))} className="mt-4 w-full resize-none border-0 bg-transparent font-display text-4xl font-bold uppercase outline-none placeholder:text-muted-foreground md:text-5xl" />
      <div className="mt-8 space-y-6">
        {post.blocks.map((block, index) => <div key={block.id} className="group relative border-l-2 border-border pl-4 focus-within:border-primary">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">{block.type}</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" disabled={index === 0} aria-label="Move block up" title="Move block up" onClick={() => move(index, -1)}><ArrowUp /></Button>
              <Button variant="ghost" size="icon" disabled={index === post.blocks.length - 1} aria-label="Move block down" title="Move block down" onClick={() => move(index, 1)}><ArrowDown /></Button>
              <Button variant="ghost" size="icon" aria-label="Delete block" title="Delete block" onClick={() => setPost((p) => ({ ...p, blocks: p.blocks.filter((b) => b.id !== block.id) }))}><Trash2 className="text-destructive" /></Button>
            </div>
          </div>
          {block.type === "image" ? <div>
            <img src={block.content} alt={block.caption ?? ""} className="max-h-[600px] w-full object-contain" />
            <input aria-label="Image caption" placeholder="Caption" value={block.caption ?? ""} maxLength={300} onChange={(e) => patchBlock(block.id, { caption: e.target.value })} className="mt-3 w-full border-b border-input bg-transparent py-2 text-center text-sm outline-none focus:border-primary" />
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm text-primary"><ImagePlus className="size-4" />Replace image<input type="file" accept="image/*" className="hidden" onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; try { patchBlock(block.id, { content: (await fileToImage(file)).src }); } catch (error) { toast.error((error as Error).message); } }} /></label>
          </div> : <textarea aria-label={block.type === "heading" ? "Heading" : "Text"} placeholder={block.type === "heading" ? "Heading" : "Write something…"} rows={block.type === "heading" ? 2 : 5} value={block.content} onChange={(e) => patchBlock(block.id, { content: e.target.value })} className={`w-full resize-y bg-transparent outline-none placeholder:text-muted-foreground ${block.type === "heading" ? "font-display text-3xl font-bold" : "text-base leading-8"}`} />}
        </div>)}
      </div>
      <div className="mt-8 flex flex-wrap gap-2 border-t border-border pt-5">
        <Button variant="outline" onClick={() => add("heading")}><Heading2 />Heading</Button>
        <Button variant="outline" onClick={() => add("text")}><Type />Text</Button>
        <Button variant="outline" disabled={busy} onClick={() => imageInput.current?.click()}><ImagePlus />{busy ? "Adding…" : "Image"}</Button>
        <input ref={imageInput} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} />
      </div>
    </div>
  </div>;
}