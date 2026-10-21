# 05 — Integrations & Backend APIs

## 1. Server Functions (`createServerFn`)

TanStack Start executes server-side logic securely through `createServerFn`. This provides RPC-style communication between the browser client and the Nitro server environment.

### 1.1 Gmail SMTP Email Dispatch (`src/lib/email.functions.ts`)

The platform includes an automated transactional email dispatcher using Gmail SMTP via `nodemailer`, authenticated with a Google App Password:

```typescript
export const sendRegistrationEmail = createServerFn({ method: "POST" })
  .inputValidator(validateEmailInput)
  .handler(async ({ data }) => sendRegistrationEmailHandler(data));
```

#### Email Structure & Branding
Every email dispatched by `sendRegistrationEmailHandler` includes:
- **Rich HTML Body** (`buildRegistrationEmailHtml`):
  - Structured card layout with dark green club accent (`#16a34a`).
  - Formatted paragraphs and line breaks preserving registration message context.
  - Standardized signature block:
    ```
    TEAM CHEMBULI FC
    [signature-message.png]
    ```
  - Inline embedded banner image (`signature-message.png`) attached with Content-ID `cid:chembuli-logo`.
  - Footer with automated notification disclaimer.
- **Plain Text Alternative** (`buildRegistrationEmailText`):
  - Preserves full textual message.
  - Standardized sign-off with `TEAM CHEMBULI FC`, official email (`chembuli.fc@gmail.com`), Instagram handle (`@chembuli.fc`), and club phone lines.
- **Inline Attachments** (`buildRegistrationEmailAttachments`):
  - Cross-platform runtime path resolution: dynamically resolves `signature-message.png` relative to `process.cwd()` across candidate bundled locations (`public/signature-message.png`, `.output/public/signature-message.png`, `src/assets/signature-message.png`).
  - Reads image content into an in-memory `Buffer` and attaches it with Content-ID `cid:chembuli-logo`.
  - Zero hardcoded OS-specific paths (`C:\Users\...` eliminated entirely). If filesystem assets are unavailable in a serverless container, gracefully falls back to the hosted URL `https://chembuli-fc.appwrite.network/signature-message.png`.

#### Required Environment Variables
| Variable | Description |
| :--- | :--- |
| `GMAIL_SENDER_EMAIL` | Sender address (default: `chembuli.fc@gmail.com`) with display name `"Chembuli FC"` |
| `GMAIL_APP_PASSWORD` | Google Account App Password (16-character token generated under 2-Step Verification) |

#### Graceful Degradation
If environment variables (specifically `GMAIL_APP_PASSWORD`) are missing (such as during local development or offline testing), the function does not crash. It cleanly returns `{ sent: false, reason: "Email sending is not set up yet" }`, allowing registration flows and admin confirmation actions to complete smoothly without interruption.


---

## 2. Error Telemetry & SSR Crash Handling

The application features a 3-tier error handling and telemetry system:

### 2.1 Out-of-Band Error Trapper (`src/lib/error-capture.ts`)
- **Problem**: Nitro / h3 swallowed unhandled exceptions into generic `500 Internal Server Error` responses, stripping stack traces and causes.
- **Solution**: Hooks `console.error`, `globalThis.addEventListener("error")`, and `unhandledrejection`. Traps Error instances into memory cache with a 5-second TTL (`consumeLastCapturedError()`), preserving deep error cause chains up to 5 levels deep.

### 2.2 Server Entrypoint Error Wrapper (`src/server.ts`)
- Intercepts uncaught SSR rendering failures before they reach the client browser.
- Falls back to `src/lib/error-page.ts` which serves an HTML recovery page with diagnostic information in development and a clean reload button in production.

### 2.3 Client Error Boundary Telemetry (`src/lib/lovable-error-reporting.ts`)
- Implemented in `src/routes/__root.tsx` (`ErrorComponent`).
- Forwards runtime errors and component crashes to telemetry listeners (`window.__lovableEvents` / `window.__lovableReportRuntimeError`) for proactive debugging.

---

## 3. Appwrite Backend Infrastructure (ACTIVE)

The data layer in `src/lib/store.ts` connects to an active [Appwrite](https://appwrite.io/) cloud project (`chembuli-website`, ID: `6ad70b6a00259c48c1b5`).

### 3.1 Appwrite Database & Collections Schema

#### Database ID: `chembuli_db`

#### Collection 1: `events`
| Attribute | Type | Size / Format | Required | Default |
| :--- | :--- | :--- | :--- | :--- |
| `slug` | String | 64 | Yes | - |
| `name` | String | 128 | Yes | - |
| `tagline` | String | 256 | Yes | - |
| `format` | String | 64 | Yes | - |
| `date` | Datetime | ISO | Yes | - |
| `closes` | Datetime | ISO | Yes | - |
| `venue` | String | 256 | Yes | - |
| `venueMap` | URL | 512 | No | null |
| `fee` | Integer | - | Yes | 0 |
| `capacity` | Integer | - | Yes | 16 |
| `trophy` | String | 128 | Yes | "" |
| `registrationOpen` | Boolean | - | Yes | true |
| `poster` | String (File ID / URL) | 512 | Yes | - |
| `schedule` | String (JSON array) | 4096 | Yes | "[]" |
| `sections` | String (JSON array) | 8192 | Yes | "[]" |
| `form` | String (JSON object) | 16384 | Yes | "{}" |

#### Collection 2: `registrations`
| Attribute | Type | Size / Format | Required | Default |
| :--- | :--- | :--- | :--- | :--- |
| `ref` | String | 32 (Index: Unique) | Yes | - |
| `eventSlug` | String | 64 (Index: Key) | Yes | - |
| `values` | String (JSON object) | 16384 | Yes | "{}" |
| `color` | String | 64 | No | null |
| `paymentScreenshot` | String (File ID) | 128 | Yes | - |
| `emailSent` | Boolean | - | Yes | false |
| `confirmed` | Boolean | - | Yes | false |
| `confirmedAt` | Datetime | ISO | No | null |

#### Collection 3: `gallery`
| Attribute | Type | Size / Format | Required | Default |
| :--- | :--- | :--- | :--- | :--- |
| `fileId` | String | 128 | Yes | - |
| `title` | String | 256 | Yes | - |
| `width` | Integer | - | Yes | - |
| `height` | Integer | - | Yes | - |

#### Collection 4: `posts`
| Attribute | Type | Size / Format | Required | Default |
| :--- | :--- | :--- | :--- | :--- |
| `title` | String | 256 | Yes | - |
| `blocks` | String (JSON array) | 65536 | Yes | "[]" |
| `published` | Boolean | - | Yes | false |

#### Collection 5: `admin_history`
| Attribute | Type | Size / Format | Required | Default | Index |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `actorId` | String | 64 | Yes | - | Key (`idx_actorId`) |
| `actorName` | String | 128 | Yes | - | - |
| `action` | String (Enum) | 64 | Yes | - | - |
| `targetType` | String | 32 | Yes | - | - |
| `targetId` | String | 128 | Yes | - | - |
| `summary` | String | 512 | Yes | - | - |
| `metadata` | String (JSON) | 8192 | Yes | "{}" | - |
| `createdAt` | Datetime | ISO | Yes | - | Key (`idx_createdAt`, DESC) |
- **Permissions**: `read("users")`, `create("users")`.

#### Collection 6: `reference_history`
| Attribute | Type | Size / Format | Required | Default | Index |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `ref` | String | 32 | Yes | - | Unique (`idx_ref`) |
| `eventSlug` | String | 64 | Yes | - | Key (`idx_eventSlug`) |
| `registrationId` | String | 64 | Yes | - | - |
| `createdAt` | Datetime | ISO | Yes | - | - |
| `ipHint` | String | 64 | No | null | - |
- **Permissions**: `create("any")`, `read("users")`.

#### Storage Bucket: `payment_proofs`
- Max file size: 5 MB (`5242880` bytes).
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp` (`jpg`, `jpeg`, `png`, `webp`).
- Permissions:
  - Create: `create("any")` (Public upload with tournament registration).
  - Read: `read("team:admins")`, `read("label:superadmin")` (Restricted strictly to members of the `admins` Team and super-admin `chari`; unauthorized/guest reads rejected with 401).
  - Update: `update("team:admins")`, `update("label:superadmin")`.
  - Delete: `delete("team:admins")`, `delete("label:superadmin")`.
- File Security: `false` (bucket-level permissions control read access).

#### Storage Bucket: `gallery_photos`
- Max file size: 20 MB.
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`.
- Permissions: Public read, Write restricted to Admin role.

---

### 3.2 Active Appwrite Client & Storage Architecture

1. **Client Initialization (`src/lib/appwrite.ts`)**:
   ```typescript
   import { Client, Databases, Storage, Account } from "appwrite";

   export const client = new Client()
     .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
     .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

   export const databases = new Databases(client);
   export const storage = new Storage(client);
   export const account = new Account(client);

   export const COLLECTIONS = {
     EVENTS: "events",
     REGISTRATIONS: "registrations",
     GALLERY: "gallery",
     POSTS: "posts",
     ADMIN_HISTORY: "admin_history",
     REFERENCE_HISTORY: "reference_history",
   } as const;
   ```

2. **Reactive Store Integration (`src/lib/store.ts`)**:
   - Primary database reads load from Appwrite cloud (`databases.listDocuments()`) on initial load and keep local reactive cache synchronized.
   - Registration flow (`addRegistration`):
     1. Writes document to `registrations` collection.
     2. Dispatches reference logging to `reference_history` collection with exponential backoff retry.
   - Authentication in `src/routes/admin.tsx` authenticates directly via `account.createEmailPasswordSession()`.

3. **Zero UI Impact**:
   Because all pages import `useDB()`, `useLiveEvents()`, and `addRegistration()` from `@/lib/store`, zero public route or component files required refactoring.


---

## 4. Appwrite Auth & Super-Admin Role System

### 4.1 Role Architecture
- **Super-Admin**: Exactly one designated super-admin account (`chari`). Distinguished by the Appwrite User label `labels: ["superadmin"]` and user ID `chari`.
  - Appwrite user labels can only be modified by the Server SDK using an API key, preventing any client-side tampering.
  - `account.get()` returns `labels` directly on the authenticated User model.
- **Regular Admins**: Enrolled in the Appwrite Team `admins` with role `admin`. They do not possess the `superadmin` label.
- **Login Identifier Flexibility**: Appwrite Auth enforces standard email formats. The login form accepts either `"chari"` or `"chari@chembulifc.com"`, automatically appending `@chembulifc.com` if no `@` symbol is entered.

### 4.2 Server-Side Mutations & JWT Verification (`src/lib/admin-users.functions.ts`)
Client browsers cannot manage other users or team memberships directly. All administrative operations execute through TanStack Start server functions:
1. **JWT Verification**: The browser requests a short-lived token via `account.createJWT()`.
2. **Caller Validation**: Server initializes `node-appwrite` `Client` using `.setJWT(jwt)` and validates `Account.get()`. If `!user.labels?.includes("superadmin")`, request is rejected with 403 Forbidden.
3. **Privileged Operations**: Executed with `node-appwrite` using `APPWRITE_API_KEY`:
   - `listAdminsFn`: Lists memberships of team `admins` and fetches user activity timestamps (`accessedAt`, `registration`).
   - `createAdminFn`: Creates new user with `Users.create()` and adds membership to team `admins` with role `admin`. Regular admins never receive the `superadmin` label. Logs to `admin_history` (`admin.create`).
   - `updateAdminFn`: Updates administrator display name, email, or resets password. Logs to `admin_history` (`admin.update`).
   - `deleteAdminFn`: Deletes administrator account. Logs to `admin_history` (`admin.delete`).
4. **Hard-Lock Guarantee**: Account `chari` and any user carrying the `superadmin` label are permanently protected against deletion or role demotion both in UI controls and on the server.

### 4.3 Environment Variables
| Variable | Scope | Purpose |
| :--- | :--- | :--- |
| `VITE_APPWRITE_ENDPOINT` | Client & Server | Appwrite API endpoint (`https://sgp.cloud.appwrite.io/v1`) |
| `VITE_APPWRITE_PROJECT_ID` | Client & Server | Appwrite Project ID (`6ad70b6a00259c48c1b5`) |
| `VITE_APPWRITE_DATABASE_ID` | Client & Server | Appwrite Database ID (`chembuli_db`) |
| `APPWRITE_API_KEY` | Server Only | Required for super-admin user management. Generated in Appwrite Console > Project Settings > API Keys with scopes: `users.read`, `users.write`, `teams.read`, `teams.write`. |

---

## 5. Audit Trails & Operational Integrity

### 5.1 Admin Audit Trail (`logAdminAction`)
- **Centralized Dispatch**: Exported from `src/lib/store.ts`. Automatically captures `actorId` and `actorName` from active Appwrite session.
- **Coverage**:
  - `event.create`, `event.update`, `event.delete`
  - `registration.confirm`, `registration.delete`, `registration.email_sent`
  - `gallery.upload`, `gallery.update`, `gallery.delete`
  - `blog.create`, `blog.update`, `blog.publish`, `blog.unpublish`, `blog.delete`
  - `admin.create`, `admin.update`, `admin.delete` (via server function with server SDK)
- **Denormalized Resilience**: Preserves admin name and human-readable summary so history remains legible even if an admin account is subsequently removed.

### 5.2 Public Reference Audit Trail (`logReferenceHistory`)
- **Uniqueness Guarantee**: Recorded immediately upon successful tournament registration submission.
- **Cross-Tournament Verification**: Checks incoming references against existing tournament registrations and the global `reference_history` collection (`registrationReferenceWithFallback`), offsetting timestamps defensively in case of collisions.
- **Tournament Manager Visibility**: Rendered directly in `/admin/events.$id` under the Registrations tab, providing administrators with transparent proof of issuance.

