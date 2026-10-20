import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { uid } from "@/data/events";
import { fileToImage, update, useDB, logAdminAction } from "@/lib/store";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/admin/gallery")({
  head: () => pageHead("Manage Gallery — Chembuli FC Admin", "Maintain the Chembuli FC match photo archive.", true),
  component: AdminGallery,
});

function AdminGallery() {
  const { gallery } = useDB();
  const [busy, setBusy] = useState(false);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    try {
      const imgs = await Promise.all(
        [...files].map((f) =>
          fileToImage(f, 1400, 0.78).then((i) => ({ ...i, title: f.name.replace(/\.[^.]+$/, "") })),
        ),
      );
      update((d) => ({ ...d, gallery: [...imgs.map((i) => ({ id: uid(), ...i })), ...d.gallery] }));
      logAdminAction(
        "gallery.upload",
        "photo",
        imgs[0]?.title || "gallery_batch",
        `Uploaded ${imgs.length} photo(s) to gallery archive`,
        { count: imgs.length, titles: imgs.map((i) => i.title) }
      ).catch(() => {});
      toast.success(`${imgs.length} photo(s) added`);
    } catch (e) {
      toast.error((e as Error).message);
    }
    setBusy(false);
  }

  const setPhoto = (
    id: string,
    patch: Partial<{ title: string; src: string; width: number; height: number }>,
  ) => {
    update((d) => ({
      ...d,
      gallery: d.gallery.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
    logAdminAction("gallery.update", "photo", id, "Updated gallery photo details", { id, ...patch }).catch(() => {});
  };

  const move = (i: number, dir: -1 | 1) =>
    update((d) => {
      const g = [...d.gallery];
      const j = i + dir;
      if (j < 0 || j >= g.length) return d;
      [g[i], g[j]] = [g[j]!, g[i]!];
      return { ...d, gallery: g };
    });

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <p className="tag-label">Manage</p>
          <h1 className="text-5xl font-bold uppercase">Gallery</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            These photos appear on the Gallery page and the home page carousel.
          </p>
        </div>
        <label className="clip-diag flex cursor-pointer items-center gap-2 bg-primary px-5 py-3 font-display font-bold uppercase tracking-widest text-primary-foreground">
          <Upload className="h-4 w-4" /> {busy ? "Adding…" : "Add photos"}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              add(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {gallery.map((p, i) => (
          <div key={p.id} className="border border-border bg-card">
            <img src={p.src} alt={p.title} className="aspect-square w-full object-cover" />
            <div className="space-y-2 p-3">
              <input
                value={p.title}
                onChange={(e) => setPhoto(p.id, { title: e.target.value })}
                className="w-full border border-input bg-background px-2 py-1 text-sm"
                placeholder="Caption"
              />
              <div className="flex items-center justify-between text-sm">
                <div className="flex gap-1">
                  <button onClick={() => move(i, -1)} className="border border-input px-2">
                    ←
                  </button>
                  <button onClick={() => move(i, 1)} className="border border-input px-2">
                    →
                  </button>
                </div>
                <label className="cursor-pointer text-muted-foreground hover:text-primary">
                  Replace
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      try {
                        setPhoto(p.id, await fileToImage(f, 1400, 0.78));
                      } catch (err) {
                        toast.error((err as Error).message);
                      }
                    }}
                  />
                </label>
                <button
                  aria-label="Delete photo"
                  onClick={() => {
                    if (!confirm("Delete this photo?")) return;
                    update((d) => ({ ...d, gallery: d.gallery.filter((x) => x.id !== p.id) }));
                    logAdminAction(
                      "gallery.delete",
                      "photo",
                      p.id,
                      `Deleted photo "${p.title || p.id}" from gallery`,
                      { id: p.id, title: p.title }
                    ).catch(() => {});
                  }}
                  className="hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
