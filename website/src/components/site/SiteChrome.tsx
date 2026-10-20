import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import logo from "@/assets/logo-alt.png";

const nav = [
  { to: "/", label: "Home" },
  { to: "/events", label: "Events" },
  { to: "/gallery", label: "Gallery" },
  { to: "/blog", label: "Blog" },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed inset-x-0 top-0 z-50 glass border-x-0 border-t-0">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="Chembuli FC crest" width={40} height={40} className="h-10 w-10 rounded-full" />
          <span className="font-display text-xl font-bold tracking-widest">CHEMBULI FC</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              className="font-display text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground transition-colors hover:text-foreground data-[status=active]:text-primary"
            >
              {n.label}
            </Link>
          ))}
          <Link to="/events" className="clip-diag bg-primary px-5 py-2 font-display text-sm font-bold uppercase tracking-widest text-primary-foreground transition hover:glow">
            Register
          </Link>
        </nav>
        <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <div className="flex h-[calc(100vh-4rem)] flex-col gap-6 bg-background px-6 pt-10 md:hidden">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="font-display text-5xl font-bold uppercase">
              {n.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-3">
        <div className="flex items-center gap-4">
          <img src={logo} alt="" width={64} height={64} loading="lazy" className="h-16 w-16 rounded-full" />
          <div>
            <p className="font-display text-2xl font-bold tracking-widest">CHEMBULI FC</p>
            <p className="text-sm text-muted-foreground">Built to compete. Built to play.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-6 font-display uppercase tracking-widest text-muted-foreground">
          <Link to="/" className="hover:text-primary">Home</Link>
          <Link to="/events" className="hover:text-primary">Events</Link>
          <Link to="/gallery" className="hover:text-primary">Gallery</Link>
          <Link to="/blog" className="hover:text-primary">Blog</Link>
          <Link to="/admin" className="hover:text-primary">Admin</Link>
        </div>
        <p className="text-sm text-muted-foreground md:text-right">
          © {new Date().getFullYear()} Chembuli FC. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
