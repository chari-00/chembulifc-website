# 04 — Routes & Page Specifications

## 1. Route Map Summary

| Path | File | Access | Description |
| :--- | :--- | :--- | :--- |
| `/` | `src/routes/index.tsx` | Public | Club landing page with hero, kick-off countdown, club stats, and event carousel. |
| `/events` | `src/routes/events.index.tsx` | Public | All tournaments catalog with status filtering tabs (Open, Upcoming, Completed). |
| `/events/$slug` | `src/routes/events.$slug.tsx` | Public | Tournament details, rules, schedule, UPI payment QR, and team registration form. |
| `/gallery` | `src/routes/gallery.tsx` | Public | Match photo gallery with responsive masonry layout and lightbox modal. |
| `/blog` | `src/routes/blog.index.tsx` | Public | Published club news, match recaps, and announcements. |
| `/blog/$id` | `src/routes/blog.$id.tsx` | Public | Individual article view rendering structured content blocks. |
| `/admin` | `src/routes/admin.tsx` (Layout)<br>`src/routes/admin.index.tsx` | Admin | Backoffice tournament dashboard and quick stats. |
| `/admin/events/$id` | `src/routes/admin.events.$id.tsx` | Admin | Tournament editor, form builder, team registrations list, screenshot viewer, confirmation dispatcher. |
| `/admin/gallery` | `src/routes/admin.gallery.tsx` | Admin | Match photo uploader, caption editor, and photo removal. |
| `/admin/blog` | `src/routes/admin.blog.tsx` | Admin | Article manager displaying published and draft posts. |
| `/admin/blog/$id` | `src/routes/admin.blog_.$id.tsx` | Admin | Block-based article editor (headings, text, image blocks). |

---

## 2. Public Route Detailed Breakdown

### 2.1 Landing Page (`/` — `src/routes/index.tsx`)
- **Hero Section**: Dramatic typography overlaid on floodlit pitch photography (`hero-pitch.jpg`). Primary CTA directs users to upcoming tournament registration.
- **Next Kick-off Countdown**: Real-time ticker counting down days, hours, minutes, and seconds to the earliest upcoming tournament.
- **Kinetic Statistics**: Rolling numbers powered by `Counter.tsx` displaying matches played, goals scored, and tournament trophies won.
- **Club Ethos & Pitch Banner**: High-energy athletic messaging ("Built to compete. Built to play.").
- **Tournament Carousel**: Interactive horizontal flex carousel (`FlexCarousel.tsx`) highlighting featured tournaments.
- **Photo Highlights**: Selected teaser shots from the club archive linking to `/gallery`.

### 2.2 Tournaments Catalog (`/events` — `src/routes/events.index.tsx`)
- **Status Filter**: Tabbed navigation allowing users to toggle between:
  - *All Tournaments*
  - *Registration Open*
  - *Upcoming Matches*
  - *Completed Tournaments*
- **Tournament Cards (`EventCard.tsx`)**: Displays poster image, format badge, date/time, venue name, registration fee, capacity, and current team registration progress.

### 2.3 Tournament Registration (`/events/$slug` — `src/routes/events.$slug.tsx`)
- **Dynamic Parameter**: `$slug` identifies the tournament.
- **Header Briefing**: High-impact header banner with format, prize pool, date, and venue map link.
- **Tournament Schedule**: Chronological match day schedule breakdown.
- **Custom Content Sections**: Rules, requirements, and prize breakdowns.
- **Live Registration Engine**:
  - Dynamically renders all custom fields configured by the admin (Captain Name, Contact Phone, Email, Player Roster, etc.).
  - **Jersey Color Picker**: Displays available non-clashing team colors; disables already chosen colors in real-time.
  - **UPI QR Code Payment**: Dynamically generates UPI payment intent strings or displays configured QR code; reveals club UPI VPA (`chembuli@upi`).
  - **Screenshot Upload**: Requires team to upload an image of their successful UPI transaction; compresses image into Base64 format and validates image headers.
  - **Submission Confirmation**: Allocates a unique `CFC-XXXXXX` reference code and persists registration immediately.

### 2.4 Match Gallery (`/gallery` — `src/routes/gallery.tsx`)
- **Interactive Masonry Grid (`Masonry.tsx`)**: Computes optimal multi-column layout without gaps regardless of image aspect ratios.
- **Lightbox Modal**: Clicking any photo opens a high-resolution modal with caption and keyboard navigation (Escape to close).

### 2.5 Club Blog (`/blog` & `/blog/$id`)
- **Listing (`/blog` — `src/routes/blog.index.tsx`)**: Fetches only published posts (`publicPosts(posts)`), ordered with newest first.
- **Reader (`/blog/$id` — `src/routes/blog.$id.tsx`)**: Renders modular content blocks:
  - Heading blocks (`<h3>`)
  - Text blocks (`<p>` with paragraph spacing)
  - Image blocks (`<figure>` with caption tags)

---

## 3. Administrative Console (`/admin`)

### 3.1 Authentication & Session Guard
- Located in `src/routes/admin.tsx`.
- Real Appwrite Auth session guard using `account.get()`.
- Supports typing login username directly (e.g. `chari` is automatically resolved to `chari@chembulifc.com`) or full email.
- Once authenticated, inspects `user.labels` for `"superadmin"`. Super-admins receive exclusive visibility of the **Admins** navigation link (`/admin/users`) and Super Admin badge.

### 3.2 Super-Admin Administrator Directory (`/admin/users`)
- **Route Guard**: Strictly guarded to users with the `superadmin` label (or user ID `chari`). Non-superadmins attempting access are instantly redirected to `/admin` with a toast notice.
- **Enrolled Directory**: Displays all club administrators in the Appwrite `admins` Team, with registration timestamp, last active login date, and role badges.
- **Enroll New Admin**: Modal dialog to create new tournament administrators in Appwrite Auth, automatically joining the `admins` Team with role `admin` (never granted `superadmin` label).
- **Edit Administrator**: Modal dialog to update name, email, or reset password.
- **Hard-Lock Security**: Super-admin account `chari` is permanently locked against deletion or role demotion both on the client UI and via server-side verification (`deleteAdminFn`).
- **Server Functions**: Backed by TanStack Start server functions in `src/lib/admin-users.functions.ts` using JWT caller verification and `node-appwrite` with `APPWRITE_API_KEY`.

### 3.3 Tournament & Registration Manager (`/admin/events.$id.tsx`)
- **Event Information Tab**: Edit name, slug, tagline, format, kick-off date, registration close date, venue, Google Maps link, registration fee, capacity, trophy, and manual registration open/closed toggle.
- **Form Builder Tab**: Add, delete, and reorder custom registration form fields (text, phone, email, select, radio, etc.); configure UPI VPA; toggle team color selection.
- **Registrations & Approvals Tab**:
  - View all registered teams with timestamp and unique `CFC-XXXXXX` reference.
  - Inspect uploaded UPI payment screenshots in a full-size modal.
  - **Email-Gated Confirmation**: The "Confirm registration" button is strictly gated and disabled until the team's confirmation email has been dispatched (`r.emailSent === true` or confirmation messaging is toggled off). Shows an inline helper label `(Send confirmation email first)` and tooltip when disabled.
  - **Strict Confirmation Scope**: Clicking "Confirm registration" strictly performs only:
    - Sets `confirmed: true` and `confirmedAt: <ISO timestamp>` on the registration document.
    - Records exactly one audit event `logAdminAction("registration.confirm", ...)` to `admin_history`.
    - Has zero redundant side effects (no duplicate email sending or unrelated mutations).
  - **Registration Deletion & Instant Color Release**: Deleting a registration invokes `deleteRegistration(id)`, calling `deleteRegistrationFn` to delete the document in Appwrite via the server API key (bypassing client-side document security restrictions on guest registrations) and re-evaluating color availability live so the deleted team's jersey color is immediately freed back to the tournament's available pool.
  - Trigger personalized confirmation emails to team captains via Gmail SMTP (`sendRegistrationEmail`).
  - **Export to CSV**: One-click spreadsheet export (`exportRegistrationsToCsv`) downloading `{slug}-registrations-{yyyy-mm-dd}.csv` with dynamic form field headers, multi-select joining, RFC 4180 cell escaping, UTF-8 BOM support, and disabled state for empty tournaments.
  - **Reference Creation Audit Trail**: Embedded per-tournament audit log section querying `reference_history` to display verified registration timestamps, assigned references, registration IDs, and client IP hints.

### 3.4 Match Photo Manager (`/admin/gallery.tsx`)
- Upload new photos with title, width, and height metadata.
- Delete outdated or low-quality photos from the public gallery.

### 3.5 Blog & Content Manager (`/admin/blog.tsx` & `/admin/blog_.$id.tsx`)
- Create new articles and manage drafts.
- **Block-Based Composer**:
  - Add and rearrange Heading, Text, and Image blocks.
  - Toggle publication state (`Draft` vs `Published`).
  - Live preview of article formatting.

### 3.6 Audit Trail & System Action History (`/admin/history` — `src/routes/admin.history.tsx`)
- **Universal Admin Visibility**: Accessible to all authenticated administrators (super-admin and regular club admins).
- **Comprehensive Activity Log**: Reverse-chronological table of all administrative actions recorded in Appwrite collection `admin_history`.
- **Advanced Filtering Toolbar**:
  - Target Category filter (`All Categories`, `Tournaments & Events`, `Registrations & Approvals`, `Gallery & Media`, `Blog Articles`, `Admin User Management`).
  - Specific Action type dropdown filter.
  - Date Range filter (`All Time`, `Today`, `Last 7 Days`, `Last 30 Days`).
- **Metadata Inspector**: Interactive modal dialog showing formatted, syntax-highlighted JSON metadata/diffs for any audited event.
- **Pagination & Counter**: Live badge indicating total recorded actions and responsive 15-item paginated navigation.

