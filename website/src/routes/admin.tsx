import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { LogOut, ShieldCheck } from "lucide-react";
import type { Models } from "appwrite";
import logo from "@/assets/logo-alt.png";
import { account } from "@/lib/appwrite";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Chembuli FC" },
      { name: "description", content: "Chembuli FC club administration." },
      { property: "og:title", content: "Admin — Chembuli FC" },
      { property: "og:description", content: "Chembuli FC club administration." },
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const [currentUser, setCurrentUser] = useState<Models.User<Models.Preferences> | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const navigate = useNavigate();

  const refreshUser = () => {
    account
      .get()
      .then((user) => {
        setCurrentUser(user);
        setAuthed(true);
      })
      .catch(() => {
        setCurrentUser(null);
        setAuthed(false);
      });
  };

  useEffect(() => {
    refreshUser();
  }, []);

  if (authed === null) return null;
  if (!authed) return <Login onDone={refreshUser} />;

  const isSuperAdmin = Boolean(currentUser?.labels?.includes("superadmin"));

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card">
        <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3">
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/admin" className="flex items-center gap-3">
              <img src={logo} alt="" className="h-9 w-9 rounded-full" />
              <span className="font-display text-lg font-bold tracking-widest">CFC ADMIN</span>
            </Link>
            <nav className="flex gap-5 font-display text-sm uppercase tracking-widest text-muted-foreground">
              <Link
                to="/admin"
                activeOptions={{ exact: true }}
                className="hover:text-foreground data-[status=active]:text-primary"
              >
                Events
              </Link>
              <Link
                to="/admin/gallery"
                className="hover:text-foreground data-[status=active]:text-primary"
              >
                Gallery
              </Link>
              <Link to="/admin/blog" className="hover:text-foreground data-[status=active]:text-primary">
                Blog
              </Link>
              <Link to="/admin/history" className="hover:text-foreground data-[status=active]:text-primary">
                History
              </Link>
              {isSuperAdmin && (
                <Link
                  to="/admin/users"
                  className="flex items-center gap-1.5 hover:text-foreground data-[status=active]:text-primary"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  Admins
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {currentUser && (
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-foreground">
                  {currentUser.name || currentUser.email}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    isSuperAdmin ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {isSuperAdmin ? "Super Admin" : "Club Admin"}
                </span>
              </div>
            )}
            <Link
              to="/"
              target="_blank"
              className="font-display text-sm uppercase tracking-widest text-muted-foreground hover:text-primary"
            >
              View site ↗
            </Link>
            <button
              onClick={async () => {
                try {
                  await account.deleteSession("current");
                } catch {
                  // ignore
                }
                setCurrentUser(null);
                setAuthed(false);
                navigate({ to: "/admin", replace: true });
              }}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-10">
        <Outlet context={{ user: currentUser, isSuperAdmin }} />
      </main>
    </div>
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    let identifier = String(fd.get("identifier") || "").trim();
    const password = String(fd.get("password") || "");

    // Allow typing username directly (e.g. "chari" -> "chari@chembulifc.com")
    if (!identifier.includes("@")) {
      identifier = `${identifier}@chembulifc.com`;
    }

    try {
      try {
        await account.deleteSession("current");
      } catch {
        // no active session
      }
      await account.createEmailPasswordSession(identifier, password);
      onDone();
    } catch (error: any) {
      setErr(error?.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  }

  const input =
    "w-full border border-input bg-background px-4 py-3 outline-none focus:border-primary";

  return (
    <div className="flex min-h-screen items-center justify-center tech-grid px-5">
      <form
        onSubmit={submit}
        className="clip-diag w-full max-w-sm space-y-4 border border-primary/40 bg-card p-8 glow"
      >
        <img src={logo} alt="Chembuli FC crest" className="mx-auto h-16 w-16 rounded-full" />
        <h1 className="text-center text-3xl font-bold uppercase">Admin sign in</h1>
        <p className="text-center text-xs text-muted-foreground">
          Sign in with your admin username or email
        </p>
        <input
          name="identifier"
          type="text"
          required
          autoComplete="username"
          placeholder="Username or email"
          className={input}
        />
        <input
          name="password"
          required
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          className={input}
        />
        {err && <p className="text-sm text-destructive">{err}</p>}
        <button
          disabled={loading}
          className="clip-diag w-full bg-primary py-3 font-display font-bold uppercase tracking-widest text-primary-foreground disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
        <Link to="/" className="block text-center text-sm text-muted-foreground hover:text-primary">
          ← Back to site
        </Link>
      </form>
    </div>
  );
}
