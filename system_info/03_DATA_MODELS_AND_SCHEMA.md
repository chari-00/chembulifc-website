# 03 — Data Models & Schema Specifications

## 1. Core Data Entities

The application's data models are located in `src/data/events.ts` and `src/data/blog.ts`.

### 1.1 `ClubEvent` & `LiveEvent`

```typescript
export type EventStatus = "open" | "upcoming" | "completed";

export interface ClubEvent {
  slug: string;                     // Unique URL identifier (e.g. "weekend-7s-cup")
  name: string;                     // Tournament title
  tagline: string;                  // Short promotional slogan
  format: string;                   // Playing format (e.g. "7v7 Knockout")
  date: string;                     // Match date & kickoff time in ISO-8601 format
  closes: string;                   // Registration cutoff deadline in ISO-8601 format
  venue: string;                    // Location name (e.g. "Chembuli Turf Arena, Kochi")
  venueMap?: string;                // Validated Google Maps URL
  fee: number;                      // Registration fee in INR (e.g. 3500)
  capacity: number;                 // Maximum number of teams (e.g. 16)
  trophy: string;                   // Prize/trophy description (e.g. "₹25,000 + Champions Trophy")
  registrationOpen: boolean;        // Manual admin override toggle
  poster: string;                   // Image path or data URL for tournament banner
  schedule: {                       // Chronological event timeline
    time: string;                   // e.g. "08:30"
    label: string;                  // e.g. "Captain's Briefing"
  }[];
  sections: {                       // Custom content sections (Rules, Prizes, etc.)
    id: string;
    title: string;
    items: string[];
  }[];
  form: EventForm;                  // Dynamic tournament registration form
}

export interface LiveEvent extends ClubEvent {
  status: EventStatus;              // Dynamically derived status
  registered: number;               // Count of registered teams
}
```

### 1.2 `EventForm` & Custom Form Builder

```typescript
export type FieldType =
  | "text"
  | "paragraph"
  | "email"
  | "tel"
  | "number"
  | "date"
  | "select"
  | "radio"
  | "checkbox";

export interface FormField {
  id: string;
  label: string;                    // Field prompt (e.g. "Team Captain Name")
  type: FieldType;
  required: boolean;
  options?: string[];               // For select/radio/checkbox options
  locked?: boolean;                 // Standard template fields that cannot be deleted
  placeholder?: string;
}

export interface TeamColor {
  name: string;                     // e.g. "Electric Blue"
  hex: string;                      // Hex code (e.g. "#1e88e5")
}

export interface EventForm {
  title: string;
  description: string;
  fields: FormField[];
  qr: string | null;                // Base64 QR code image or generated UPI payment QR
  upiId: string;                    // Club UPI VPA (e.g. "chembuli@upi")
  colorPicker: boolean;             // Toggle team jersey color chooser on/off
  colors: TeamColor[];              // Available team colors for this tournament
  messageEnabled?: boolean;         // Toggle registration confirmation email sending
  message: {
    subject: string;
    body: string;
  };
}
```

### 1.3 `Registration`

```typescript
export interface Registration {
  id: string;                       // Unique internal registration ID
  ref: string;                      // Unique tournament reference (e.g. "CFC-A4B7D2")
  eventSlug: string;                // Associated tournament slug
  values: Record<string, string | string[]>; // Submitted dynamic form values
  color?: string;                   // Selected jersey color name
  createdAt: string;                // ISO-8601 creation timestamp
  paymentScreenshot?: string;       // Verified Base64 UPI payment screenshot
  emailSent?: boolean;              // Whether confirmation email has been dispatched
  confirmed?: boolean;              // Admin verified / confirmed flag
  confirmedAt?: string;             // ISO-8601 confirmation timestamp
}
```

### 1.4 `Photo` (Match Gallery)

```typescript
export interface Photo {
  id: string;                       // Unique photo ID
  src: string;                      // Asset path or image URL
  title: string;                    // Caption / title (e.g. "Derby Final 2026")
  width: number;                    // Intrinsic width in pixels
  height: number;                   // Intrinsic height in pixels
}
```

### 1.5 `BlogPost` & `BlogBlock`

```typescript
export type BlogBlock = {
  id: string;
  type: "heading" | "text" | "image";
  content: string;
  caption?: string;                 // Applicable when type === "image"
};

export interface BlogPost {
  id: string;                       // Unique post ID
  title: string;                    // Article title
  blocks: BlogBlock[];              // Ordered content blocks
  published: boolean;               // True = visible to public, False = admin draft
  createdAt: string;                // ISO-8601
  updatedAt: string;                // ISO-8601
}
```

### 1.6 `AdminHistoryEntry` & `AdminAction` Audit Model

```typescript
export type AdminAction =
  | "event.create"
  | "event.update"
  | "event.delete"
  | "registration.confirm"
  | "registration.delete"
  | "registration.email_sent"
  | "gallery.upload"
  | "gallery.update"
  | "gallery.delete"
  | "blog.create"
  | "blog.update"
  | "blog.publish"
  | "blog.unpublish"
  | "blog.delete"
  | "admin.create"
  | "admin.update"
  | "admin.delete";

export type AdminTargetType = "event" | "registration" | "photo" | "blog" | "admin" | "system";

export interface AdminHistoryEntry {
  $id?: string;
  actorId: string;                  // Appwrite User ID of the acting administrator
  actorName: string;                // Denormalized name or email at time of action
  action: AdminAction;              // Specific mutation enum
  targetType: AdminTargetType;      // Resource domain
  targetId: string;                 // Target identifier (slug, regId, photoId, postId, userId)
  summary: string;                  // Human-readable single-line description of the action
  metadata: string;                 // Serialized JSON object capturing payload or diff context
  createdAt: string;                // ISO-8601 timestamp
}
```

### 1.7 `ReferenceHistoryEntry`

```typescript
export interface ReferenceHistoryEntry {
  $id?: string;
  ref: string;                      // Globally unique tournament reference (e.g. "CFC-A4B7D2")
  eventSlug: string;                // Tournament slug
  registrationId: string;           // Associated registration document ID
  createdAt: string;                // ISO-8601 creation timestamp
  ipHint?: string;                  // Optional IP or client context hint
}
```

---

## 2. Business Invariants & Derivations

### Rule 1: Dynamic Event Status (NEVER STORED)
The status of a tournament is computed dynamically via `eventStatus(event, now)` and is **never** written to database storage.
```typescript
export function eventStatus(e: ClubEvent, now = Date.now()): EventStatus {
  const eventTime = new Date(e.date).getTime();
  if (eventTime <= now) return "completed";
  const closeTime = new Date(e.closes).getTime();
  if (!e.registrationOpen || closeTime <= now) return "upcoming";
  return "open";
}
```
- **"completed"**: Current time is past the event start date (`eventTime <= now`).
- **"upcoming"**: Registration is closed (past `closes` deadline or `registrationOpen === false`), but the match has not yet been played.
- **"open"**: Current time is before `closes` deadline AND `registrationOpen === true`.

### Rule 2: Tournament Reference Allocation & Global Uniqueness
Every team registration receives a reference code formatted as `CFC-XXXXXX`:
```typescript
export function registrationReference(existing: string[], now = Date.now()): string {
  // Generates unique code starting with "CFC"
  // Guarantees zero duplicates within the tournament
}

export function registrationReferenceWithFallback(
  existing: string[],
  isGloballyTaken: (ref: string) => boolean,
  now = Date.now(),
): string {
  // Generates base reference and tests against existing tournament + global reference log.
  // In the event of cross-tournament collision, safely shifts timestamp offset until unique.
}
```
- Every code starts with `CFC-`.
- Tested against existing tournament references and verified against the global `reference_history` collection.
- Unit tests (`src/test/events-rules.test.tsx`) guarantee collision avoidance even under identical millisecond timestamps.

### Rule 3: UPI Payment Screenshot Validation
Uploaded payment evidence must be validated before storage:
```typescript
export function validPaymentScreenshot(value: string | undefined): value is string {
  return !!value && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
}
```
- Only valid Base64 data URLs for JPEG, PNG, or WebP images are accepted.

### Rule 4: Team Color Palette Allocation
Jersey colors are picked from a curated list of high-contrast basic athletic colors (`BASIC_COLORS`).
- To prevent team color clashes, the available palette scales with tournament capacity:
  $$\text{Color Count} = \text{Capacity} + 5$$
- Color names are always human-readable (e.g. "White", "Red", "Navy", "Lime") and never generic placeholders.

### Rule 5: Venue Map Link Security
Admin-provided venue map links are validated via `validVenueMap(url)`:
- Accepts only trusted Google Maps domains (`maps.google.com`, `maps.app.goo.gl`, `goo.gl/maps`).
- Rejects dangerous protocols (`javascript:`, `data:`, insecure redirects).

### Rule 6: Editorial Blog Draft Separation
Public blog listing enforces `publicPosts(posts)`:
```typescript
export function publicPosts(posts: BlogPost[]) {
  return posts
    .filter((post) => post.published)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
```
- Unfinished drafts remain completely hidden from public `/blog` routes until explicitly toggled to `published: true` by an admin.

### Rule 7: Registration CSV Export & RFC 4180 Encoding
Exporting registrations follows standardized spreadsheet serialization:
```typescript
export function generateRegistrationsCsv(event: ClubEvent, registrations: Registration[]): string;
```
- **Dynamic Header Derivation**: Headers reflect `event.form.fields` human-readable labels in exact order.
- **Dynamic Color Column**: `"Team Color"` column is included if and only if `event.form.colorPicker` is `true`.
- **Delimited Multi-Selections**: Checkbox array values are joined using `"; "` to keep answers within a single cell.
- **Safe Binary Indicator**: Uploaded payment screenshot proof is serialized as `"Uploaded"` or `"Not uploaded"` (raw base64/file IDs are never embedded).
- **RFC 4180 Escaping**: Any cell containing commas, quotes, or newlines is wrapped in double quotes with internal quotes doubled (`""`).
- **UTF-8 BOM**: Downloads prepend `\uFEFF` so Microsoft Excel and Google Sheets render Indian Rupee (`₹`) and non-ASCII characters without encoding glitches.

