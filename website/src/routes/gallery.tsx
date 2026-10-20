import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import AnimatedContent from "@/components/bits/AnimatedContent";
import Masonry from "@/components/bits/Masonry";
import { useDB } from "@/lib/store";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Gallery — Chembuli FC Match Archive" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "description",
        content: "Photos and moments from Chembuli FC tournaments and matches.",
      },
      { property: "og:title", content: "Chembuli FC Gallery" },
      { property: "og:description", content: "The Chembuli FC match archive." },
    ],
  }),
  component: Gallery,
});

function Gallery() {
  const { gallery } = useDB();
  return (
    <section className="mx-auto max-w-7xl px-5 py-20">
      <AnimatedContent trigger="mount" distance={50} blur={8}>
        <p className="tag-label">Archive</p>
        <h1 className="mt-3 text-6xl font-bold uppercase md:text-8xl">Gallery</h1>
      </AnimatedContent>
      <div className="mt-12">
        <ClientOnly fallback={<div className="h-96" />}>
          {gallery.length === 0 ? (
            <p className="font-display uppercase tracking-widest text-muted-foreground">
              No photos yet.
            </p>
          ) : (
            <Masonry
              items={gallery.map((p) => ({
                id: p.id,
                img: p.src,
                width: p.width,
                height: p.height,
                title: p.title,
                alt: p.title,
              }))}
              columnWidth={280}
              gap={14}
              radius={4}
              animateFrom="bottom"
              hoverEffect="zoom"
              captions="hover"
              lightbox
              draggable={false}
            />
          )}
        </ClientOnly>
      </div>
    </section>
  );
}
