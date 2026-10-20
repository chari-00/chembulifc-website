# 00 — System Overview

## 1. Executive Summary

**Chembuli FC** is the official web application and tournament management platform for Chembuli Football Club. The system provides a high-performance digital presence combining an energetic, athletic aesthetic with practical tournament logistics:
- **Public Club Portal**: Highlights club identity, match schedules, past tournament records, high-resolution photo archives, and club news/editorial articles.
- **Tournament Engine**: Allows teams to discover upcoming tournaments, inspect venue maps, review rules, select distinct jersey colors, pay registration fees via integrated UPI QR codes, upload payment proof, and register online.
- **Backoffice Admin Console**: Enables tournament managers to configure tournaments, build dynamic custom registration forms, inspect and approve team submissions (with payment screenshot verification), manage team color assignments, publish match photo galleries, and compose blog updates.

---

## 2. Core Feature Matrix

| Domain | Key Capabilities |
| :--- | :--- |
| **Club Landing (`/`)** | Kinetic hero section with athletic imagery, next kick-off countdown timer, club statistics counters, ethos statement, tournament carousel, and photo highlights. |
| **Tournaments (`/events`)** | Filterable list of tournaments (Open for registration, Upcoming, Completed), capacity counters, prize pool displays, venue details, and registration deadline indicators. |
| **Registration (`/events/$slug`)** | Detailed tournament brief, interactive schedule breakdown, venue map integration (Google Maps), team registration form, real-time jersey color chooser (prevents clash), dynamic UPI QR code generator, and base64 payment screenshot uploader. |
| **Match Gallery (`/gallery`)** | High-performance masonry photo grid powered by dynamic column calculations, hover zoom animations, caption reveals, and responsive lightbox viewer. |
| **Editorial Blog (`/blog`)** | Chronological list of published match reports, club notices, and team announcements. Block-based article view (`/blog/$id`) supporting styled headings, narrative text, and photographic embeds. |
| **Admin Operations (`/admin`)** | Protected club management suite: event creation and customization, custom registration form builder, team registration approvals with UPI screenshot inspection, email confirmation triggers via Gmail SMTP, one-click CSV registration export, complete admin audit trail (`/admin/history`), and super-admin user directory (`/admin/users`). |

---

## 3. Technology Stack & Tooling

### Core Framework & Runtime
- **TanStack Start (`v1.168.60`)**: Full-stack React framework providing hybrid SSR and client-side execution, bundled with Nitro server engine.
- **TanStack Router (`v1.170.41`)**: Type-safe, file-based client/server routing system.
- **TanStack Query (`v5.101.1`)**: Data fetching and caching layer.
- **React (`v19.2.0`)** & **React DOM (`v19.2.0`)**: Component rendering engine with React 19 architecture.
- **TypeScript (`v5.8.3`)**: Strict static typing with path aliases (`@/*` pointing to `src/*`).

### Backend Services & Storage
- **Appwrite Cloud Backend (`v1.5+`)**: Dedicated project `chembuli-website` (ID: `6ad70b6a00259c48c1b5`, database: `chembuli_db`) hosting 6 collections (`events`, `registrations`, `gallery`, `posts`, `admin_history`, `reference_history`) and 2 storage buckets (`payment_proofs`, `gallery_photos`).
- **Appwrite Authentication & Roles**: Super-admin (`chari`, label `superadmin`) and regular tournament administrators (Appwrite Team `admins`).
- **Appwrite SDKs**: Client-side `appwrite` (`v17.0.0`) and server-side `node-appwrite` (`v15.0.0`) for privileged management.
- **Transactional Email**: Direct Gmail SMTP transport (`smtp.gmail.com:465`) via `nodemailer` (`v6.10.0`), authenticated with Google App Passwords.

### Styling & Animation
- **Tailwind CSS (`v4.2.1`)**: Utility-first CSS engine configured via `@tailwindcss/vite` in modern CSS cascade layer syntax (`src/styles.css`).
- **Design Tokens**: Vibrant energetic sports theme with dark mode foundation, CSS variables for club primary/accent colors, athletic diagonal cuts (`clip-diag`), glassmorphism (`glass`), and glow utilities (`glow`).
- **GSAP (`v3.15.0`)** & **OGL (`v1.0.11`)**: High-performance UI micro-animations and WebGL-capable canvas effects for interactive bits.
- **Embla Carousel (`v8.6.0`)**: Smooth, touch-friendly responsive carousel components.
- **Lucide React (`v0.575.0`)**: Cohesive modern icon system.

### Production Deployment (Appwrite Sites)
- **Live URL**: [`https://chembuli-fc.appwrite.network`](https://chembuli-fc.appwrite.network)
- **Host**: Appwrite Sites (Project `chembuli-website`, ID `6ad70b6a00259c48c1b5`, Region `sgp`)
- **Site ID**: `6ad741c0000a8fecb4b7`
- **Connected Repository**: [`chari-00/chembulifc-website`](https://github.com/chari-00/chembulifc-website.git) (Branch: `main`, Root Directory: `website`)
- **Runtime & Strategy**: Node.js 22 (`buildRuntime: node-22`), SSR (`adapter: ssr`)
- **Output Directory**: `./.output` (Nitro v3 server & public assets)
- **Continuous Deployment**: Automated on push to `main` via Appwrite VCS integration.

---

## 4. Brand & Logo Specifications

The repository contains the official high-resolution branding assets in the `logo/` folder.

- **Protected Directory Rule**: `logo/` must **never** be deleted, modified, or overwritten.
- **Active Crest Asset**: `c:\Users\hailq\Music\Chembuli\logo\logo-alt.png` is the primary club crest.
- **Application Asset Resolution**: In `website/src/assets/logo-alt.png` and `website/public/logo-alt.png`, the club crest is imported directly:
  ```tsx
  import logo from "@/assets/logo-alt.png";
  // Used across navigation header, footer, and admin portals
  <img src={logo} alt="Chembuli FC crest" className="h-10 w-10 rounded-full" />
  ```

---

## 5. Development Quick-Start

To run and verify the platform locally:

```bash
# 1. Navigate to the website root
cd website

# 2. Install dependencies (npm or bun)
npm install
# or: bun install

# 3. Start local development server (Vite + TanStack Start)
npm run dev

# 4. Execute test suite (Vitest)
npm test

# 5. Build for production (Nitro Cloudflare/Node bundle)
npm run build

# 6. Preview production build locally
npm run preview
```
