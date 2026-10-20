# 01 — System Architecture & Design Patterns

## 1. High-Level Architecture Overview

The Chembuli FC platform is built as a modern, reactive full-stack web application using **TanStack Start** and **Nitro**. It leverages hybrid Server-Side Rendering (SSR) for search engine indexing and initial page performance, transitioning to a reactive client-side Single Page Application (SPA) with optimistic UI updates.

```
[ Client Browser ]
        |
        v
[ TanStack Start / Nitro SSR & Server Functions ]
   |-- Server-side rendering (HTML + Metadata injection)
   |-- createServerFn: Gmail SMTP Email Gateway (Nodemailer)
   |-- createServerFn: Super-Admin User Management (JWT + node-appwrite)
        |
        v
[ Client Application Shell (React 19) ]
   |-- Root Layout (__root.tsx) -> SiteChrome (Header / Footer)
   |-- TanStack Router (File-based routes in src/routes/)
   |-- Reactive Store (src/lib/store.ts via useSyncExternalStore)
        |
        v
[ Active Backend: Appwrite Cloud Platform ("chembuli-website") ]
   |-- Appwrite Auth & Teams (Super-Admin "chari" + Team "admins")
   |-- Appwrite Database: "chembuli_db"
   |     |-- events (tournaments, forms, schedules)
   |     |-- registrations (team submissions, values, confirmation flags)
   |     |-- gallery (match photography metadata)
   |     |-- posts (editorial blog posts and blocks)
   |     |-- admin_history (immutable operational audit log)
   |     |-- reference_history (global tournament reference ledger)
   |-- Appwrite Storage Buckets:
         |-- payment_proofs (UPI payment screenshots, max 5MB)
         |-- gallery_photos (match imagery, max 20MB)
```

---

## 2. Layout & Routing Hierarchy

The project adheres strictly to TanStack Router's file-based routing convention.

### Root Shell (`src/routes/__root.tsx`)
- Houses `RootShell` (`<html>`, `<head>`, `<body>`, `HeadContent`, `Scripts`).
- Injects global font links (Rajdhani athletic headline font & Manrope body typography).
- Integrates `SiteChrome` (`Header` and `Footer`) for public routes.
- Renders global floating toasts via Sonner (`<Toaster />`).
- Enforces global `ErrorComponent` (reporting to Lovable telemetry) and `NotFoundComponent` (custom 404).

### Public Routing Tier
- `/` (`src/routes/index.tsx`): Main landing experience.
- `/events` (`src/routes/events.index.tsx`): Tournament listings.
- `/events/$slug` (`src/routes/events.$slug.tsx`): Individual tournament page with dynamic route parameter `$slug`.
- `/gallery` (`src/routes/gallery.tsx`): Photo archive with masonry grid.
- `/blog` (`src/routes/blog.index.tsx`): Blog listing.
- `/blog/$id` (`src/routes/blog.$id.tsx`): Article reader by ID.

### Administrative Tier (`/admin`)
- Sub-layout defined in `src/routes/admin.tsx`.
- Protected by real Appwrite Auth session guard (`account.get()`). Supports username shorthand (`chari`) or full email.
- Displays navigation bar (`CFC ADMIN`), sub-navigation links (`Events`, `Gallery`, `Blog`, `History`), Super-Admin only link (`Admins`), and a Sign-out action.
- Contains child routes:
  - `/admin/index.tsx`: Event management overview table.
  - `/admin/events.$id.tsx`: Deep event editor, custom form builder, registrations manager, CSV export, and reference audit log.
  - `/admin/gallery.tsx`: Match photo manager.
  - `/admin/blog.tsx`: Blog list & draft statuses.
  - `/admin/blog_.$id.tsx`: Block editor for posts.
  - `/admin/history.tsx`: Centralized administrative audit log with filtering, pagination, and JSON inspect.
  - `/admin/users.tsx`: Super-admin administrator management console (Team "admins" enrollment, updates, hard-locked safety).

---

## 3. Data Store Pattern (`src/lib/store.ts`)

The application isolates all data persistence behind a unified reactive data access boundary connecting directly to Appwrite Cloud:

```typescript
export interface DB {
  events: ClubEvent[];
  gallery: Photo[];
  registrations: Registration[];
  posts: BlogPost[];
}
```

### Key Architectural Characteristics
1. **Unified Storage Boundary**: Every page reads via `useDB()` or `useLiveEvents()` and writes via `update((db) => DB)`.
2. **Appwrite Cloud Persistence**: Real-time reads from Appwrite Database `chembuli_db` collections (`events`, `registrations`, `gallery`, `posts`).
3. **Reactive Synchronization**: Built using React 19's `useSyncExternalStore` and custom pub/sub listener set. Local memory cache ensures instant optimistic updates and zero UI lag.
4. **Audit Logging Dispatches**: Mutating operations trigger asynchronous dispatches to `logAdminAction(...)` (`admin_history`) and `logReferenceHistory(...)` (`reference_history`).
5. **Initial Seeding**: Fallback seed data in `src/data/events.ts` and `scripts/seed-appwrite.ts` allows immediate database initialization.

---

## 4. Operational Integrity & Audit Architecture

The platform enforces two distinct, decoupled audit streams:
1. **Admin Action Audit (`admin_history`)**: Tracks every privileged change made by administrators (event creation/updates/deletions, registration confirmations/deletions, gallery uploads/deletions, blog publishing, and administrator enrollment). Features denormalized actor credentials to remain legible forever.
2. **Reference Allocation Ledger (`reference_history`)**: Records every unique `CFC-XXXXXX` reference issued to registering teams, backed by global cross-tournament collision detection (`registrationReferenceWithFallback`) and automatic defensive offset generation.

---

## 5. Asset Pipeline & Logo Invariants

### 1. Logo Asset Routing
- The master crest is stored in `logo/logo-alt.png`.
- To prevent broken asset paths caused by third-party hosted sandboxes, the logo is bundled into `src/assets/logo-alt.png` and `public/logo-alt.png`.
- Component imports:
  ```tsx
  import logo from "@/assets/logo-alt.png";
  ```
- Vite resolves this import to a cache-busted, fingerprinted URL at build time and inlines small SVGs/images when appropriate.

### 2. High-Resolution Photographic Media
- `src/assets/hero-pitch.jpg`: Floodlit pitch hero banner.
- `src/assets/event-1.jpg`, `event-2.jpg`: Tournament promotional posters.
- `src/assets/gallery-1.jpg`, `gallery-2.jpg`, `gallery-3.jpg`: Match action photos with predefined aspect ratios.
- Base64 User Uploads: Payment screenshots uploaded during team registration are compressed, verified, and stored as Base64 Data URLs (`data:image/(png|jpeg|webp);base64,...`).
