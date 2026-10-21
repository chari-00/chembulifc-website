import { useMemo, useSyncExternalStore } from "react";
import { ID, Query } from "appwrite";
import {
  type ClubEvent,
  type LiveEvent,
  type Photo,
  type Registration,
  eventStatus,
  generateColors,
  registrationReference,
  validPaymentScreenshot,
  uid,
} from "@/data/events";
import type { BlogPost } from "@/data/blog";
import {
  client,
  databases,
  storage,
  account,
  DATABASE_ID,
  COLLECTIONS,
  BUCKETS,
} from "@/lib/appwrite";
import { listRegistrationsFn, deleteRegistrationFn } from "@/lib/registrations.functions";

export type { Photo };

export interface DB {
  events: ClubEvent[];
  gallery: Photo[];
  registrations: Registration[];
  posts: BlogPost[];
}

export type AdminAction =
  | "event.create"
  | "event.update"
  | "event.delete"
  | "registration.confirm"
  | "registration.email"
  | "registration.delete"
  | "gallery.upload"
  | "gallery.update"
  | "gallery.reorder"
  | "gallery.delete"
  | "blog.create"
  | "blog.update"
  | "blog.publish"
  | "blog.unpublish"
  | "blog.delete"
  | "admin.create"
  | "admin.update"
  | "admin.delete";

export type AdminTargetType = "event" | "registration" | "photo" | "post" | "admin";

export interface AdminHistoryEntry {
  id: string;
  actorId: string;
  actorName: string;
  action: AdminAction;
  targetType: AdminTargetType;
  targetId: string;
  summary: string;
  metadata?: Record<string, any> | undefined;
  createdAt: string;
}

export interface ReferenceHistoryEntry {
  id: string;
  ref: string;
  eventSlug: string;
  registrationId: string;
  createdAt: string;
  ipHint?: string | undefined;
}

const emptyDB = (): DB => ({ events: [], gallery: [], registrations: [], posts: [] });
const serverSnapshot = emptyDB();
let cache: DB | null = null;
const listeners = new Set<() => void>();
let isInitialized = false;

/** Sane defaults for documents read from Appwrite. */
export function normalize(db: DB): DB {
  return {
    ...db,
    posts: db.posts ?? [],
    gallery: db.gallery ?? [],
    registrations: db.registrations ?? [],
    events: (db.events ?? []).map((e) => ({
      ...e,
      trophy: e.trophy ?? "",
      form: {
        ...e.form,
        messageEnabled: e.form?.messageEnabled ?? true,
        colors: e.form?.colors?.length ? e.form.colors : generateColors(e.capacity || 16),
      },
    })),
  };
}

/** Converts base64 image data URL to a Blob for Appwrite storage upload. */
export function base64ToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = header?.match(/:(.*?);/)?.[1] || "image/jpeg";
  const binary = atob(base64 || "");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/** Converts base64 image data URL to a File object for storage upload. */
export function base64ToFile(dataUrl: string, filename: string): File {
  const blob = base64ToBlob(dataUrl);
  return new File([blob], filename, { type: blob.type });
}

/** Resolves an Appwrite fileId or relative/http URL to a direct view URL. */
export function getFileUrl(bucketId: string, fileIdOrUrl: string): string {
  if (!fileIdOrUrl) return "";
  if (fileIdOrUrl.startsWith("http://") || fileIdOrUrl.startsWith("https://") || fileIdOrUrl.startsWith("/")) {
    return fileIdOrUrl;
  }
  try {
    return storage.getFileView(bucketId, fileIdOrUrl).toString();
  } catch {
    return fileIdOrUrl;
  }
}

/** Uploads base64 image to an Appwrite bucket and returns the resulting file ID. */
export async function uploadBase64Image(bucketId: string, dataUrl: string, prefix = "img"): Promise<string> {
  const ext = dataUrl.includes("image/png") ? "png" : dataUrl.includes("image/webp") ? "webp" : "jpg";
  const file = base64ToFile(dataUrl, `${prefix}-${Date.now()}.${ext}`);
  const result = await storage.createFile(bucketId, ID.unique(), file);
  return result.$id;
}

/** Reads documents directly from Appwrite chembuli_db and updates in-memory cache. */
export async function refreshFromAppwrite(): Promise<DB> {
  try {
    const [eventsRes, galleryRes, postsRes, regsRes] = await Promise.all([
      databases.listDocuments(DATABASE_ID, COLLECTIONS.EVENTS, [Query.limit(100)]),
      databases.listDocuments(DATABASE_ID, COLLECTIONS.GALLERY, [Query.orderDesc("$createdAt"), Query.limit(100)]),
      databases.listDocuments(DATABASE_ID, COLLECTIONS.POSTS, [Query.limit(100)]),
      // Defensively catch 401 on registrations and fall back to server function
      databases.listDocuments(DATABASE_ID, COLLECTIONS.REGISTRATIONS, [Query.limit(500)]).catch(async () => {
        try {
          const srv = await listRegistrationsFn();
          return srv && (srv as any).documents ? srv : { documents: [] };
        } catch {
          return { documents: [] };
        }
      }),
    ]);

    const events: ClubEvent[] = eventsRes.documents.map((doc: any) => ({
      slug: doc.slug,
      name: doc.name,
      tagline: doc.tagline,
      format: doc.format,
      date: doc.date,
      closes: doc.closes,
      venue: doc.venue,
      venueMap: doc.venueMap || undefined,
      fee: doc.fee ?? 0,
      capacity: doc.capacity ?? 16,
      trophy: doc.trophy ?? "",
      registrationOpen: doc.registrationOpen ?? true,
      poster: doc.poster,
      schedule: typeof doc.schedule === "string" ? JSON.parse(doc.schedule) : (doc.schedule ?? []),
      sections: typeof doc.sections === "string" ? JSON.parse(doc.sections) : (doc.sections ?? []),
      form: typeof doc.form === "string" ? JSON.parse(doc.form) : (doc.form ?? {}),
    }));

    const gallery: Photo[] = galleryRes.documents.map((doc: any) => ({
      id: doc.$id,
      src: getFileUrl(BUCKETS.GALLERY_PHOTOS, doc.fileId),
      title: doc.title,
      width: doc.width ?? 1200,
      height: doc.height ?? 800,
    }));

    const posts: BlogPost[] = postsRes.documents.map((doc: any) => ({
      id: doc.$id,
      title: doc.title,
      blocks: typeof doc.blocks === "string" ? JSON.parse(doc.blocks) : (doc.blocks ?? []),
      published: doc.published ?? false,
      createdAt: doc.$createdAt,
      updatedAt: doc.$updatedAt,
    }));

    const registrations: Registration[] = regsRes.documents.map((doc: any) => ({
      id: doc.$id,
      ref: doc.ref,
      eventSlug: doc.eventSlug,
      values: typeof doc.values === "string" ? JSON.parse(doc.values) : (doc.values ?? {}),
      color: doc.color || undefined,
      paymentScreenshot: doc.paymentScreenshot
        ? (doc.paymentScreenshot.startsWith("data:") || doc.paymentScreenshot.startsWith("http")
            ? doc.paymentScreenshot
            : getFileUrl(BUCKETS.PAYMENT_PROOFS, doc.paymentScreenshot))
        : undefined,
      emailSent: doc.emailSent ?? false,
      confirmed: doc.confirmed ?? false,
      confirmedAt: doc.confirmedAt || undefined,
      createdAt: doc.$createdAt,
    }));

    const nextDb: DB = normalize({
      events,
      gallery,
      posts,
      registrations,
    });

    cache = nextDb;
    listeners.forEach((l) => l());
    return nextDb;
  } catch (err) {
    console.warn("[Appwrite Store] Refresh failed:", err);
    return cache || emptyDB();
  }
}

/** Synchronizes changes directly to Appwrite backend. Propagates errors to caller. */
async function syncToAppwrite(prev: DB, next: DB): Promise<void> {
  // 1. Sync Events
  for (const ev of next.events) {
    const old = prev.events.find((e) => e.slug === ev.slug);

    let poster = ev.poster;
    // Upload wallpaper image to storage bucket if base64 data URL
    if (typeof poster === "string" && poster.startsWith("data:")) {
      try {
        const fileId = await uploadBase64Image(BUCKETS.GALLERY_PHOTOS, poster, "poster");
        poster = getFileUrl(BUCKETS.GALLERY_PHOTOS, fileId);
        ev.poster = poster;
      } catch (err) {
        console.error("[Store] Event poster upload failed:", err);
        throw new Error("Failed to upload tournament poster to storage");
      }
    }

    // Upload QR code to storage bucket if base64 data URL
    let formObj = ev.form || {};
    if (formObj.qr && typeof formObj.qr === "string" && formObj.qr.startsWith("data:")) {
      try {
        const fileId = await uploadBase64Image(BUCKETS.GALLERY_PHOTOS, formObj.qr, "qr");
        formObj = { ...formObj, qr: getFileUrl(BUCKETS.GALLERY_PHOTOS, fileId) };
        ev.form = formObj;
      } catch (err) {
        console.error("[Store] Form QR upload failed:", err);
      }
    }

    const payload = {
      name: ev.name,
      slug: ev.slug,
      tagline: ev.tagline,
      format: ev.format,
      date: ev.date,
      closes: ev.closes,
      venue: ev.venue,
      venueMap: ev.venueMap || null,
      fee: ev.fee,
      capacity: ev.capacity,
      trophy: ev.trophy,
      registrationOpen: ev.registrationOpen,
      poster: typeof poster === "string" && poster.length <= 512 ? poster : "/src/assets/hero-pitch.jpg",
      schedule: JSON.stringify(ev.schedule || []),
      sections: JSON.stringify(ev.sections || []),
      form: JSON.stringify(formObj || {}),
    };

    if (!old) {
      try {
        await databases.createDocument(DATABASE_ID, COLLECTIONS.EVENTS, ev.slug, payload);
      } catch (err: any) {
        if (err?.code === 409) {
          await databases.updateDocument(DATABASE_ID, COLLECTIONS.EVENTS, ev.slug, payload);
        } else {
          throw err;
        }
      }
    } else if (JSON.stringify(old) !== JSON.stringify(ev)) {
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.EVENTS, ev.slug, payload);
    }
  }

  for (const ev of prev.events) {
    if (!next.events.some((e) => e.slug === ev.slug)) {
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.EVENTS, ev.slug);
    }
  }

  // 2. Sync Gallery Photos
  for (const photo of next.gallery) {
    const old = prev.gallery.find((p) => p.id === photo.id);
    let fileId = photo.src;

    if (photo.src.startsWith("data:")) {
      fileId = await uploadBase64Image(BUCKETS.GALLERY_PHOTOS, photo.src, "gallery");
      photo.src = getFileUrl(BUCKETS.GALLERY_PHOTOS, fileId);
    } else if (photo.src.includes("/files/")) {
      // Extract raw fileId from view URL if present
      const match = photo.src.match(/\/files\/([^\/]+)/);
      if (match?.[1]) {
        fileId = match[1];
      }
    }

    const payload = {
      fileId,
      title: photo.title,
      width: photo.width,
      height: photo.height,
    };

    if (!old) {
      try {
        await databases.createDocument(DATABASE_ID, COLLECTIONS.GALLERY, photo.id, payload);
      } catch (err: any) {
        if (err?.code === 409) {
          await databases.updateDocument(DATABASE_ID, COLLECTIONS.GALLERY, photo.id, payload);
        } else {
          throw err;
        }
      }
    } else if (JSON.stringify(old) !== JSON.stringify(photo)) {
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.GALLERY, photo.id, payload);
    }
  }

  for (const photo of prev.gallery) {
    if (!next.gallery.some((p) => p.id === photo.id)) {
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.GALLERY, photo.id);
    }
  }

  // 3. Sync Blog Posts
  for (const post of next.posts) {
    const old = prev.posts.find((p) => p.id === post.id);

    const processedBlocks = await Promise.all(
      post.blocks.map(async (block) => {
        if (block.type === "image" && block.content.startsWith("data:")) {
          try {
            const fileId = await uploadBase64Image(BUCKETS.BLOG_IMAGES, block.content, "blog");
            return { ...block, content: getFileUrl(BUCKETS.BLOG_IMAGES, fileId) };
          } catch (err) {
            console.warn("[Store] Blog image upload failed:", err);
            return block;
          }
        }
        return block;
      })
    );
    post.blocks = processedBlocks;

    const payload = {
      title: post.title,
      blocks: JSON.stringify(post.blocks || []),
      published: post.published,
    };

    if (!old) {
      try {
        await databases.createDocument(DATABASE_ID, COLLECTIONS.POSTS, post.id, payload);
      } catch (err: any) {
        if (err?.code === 409) {
          await databases.updateDocument(DATABASE_ID, COLLECTIONS.POSTS, post.id, payload);
        } else {
          throw err;
        }
      }
    } else if (JSON.stringify(old) !== JSON.stringify(post)) {
      try {
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.POSTS, post.id, payload);
      } catch (err: any) {
        if (err?.code === 404) {
          // Document did not exist in cloud database yet, create it
          await databases.createDocument(DATABASE_ID, COLLECTIONS.POSTS, post.id, payload);
        } else {
          throw err;
        }
      }
    }
  }

  for (const post of prev.posts) {
    if (!next.posts.some((p) => p.id === post.id)) {
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.POSTS, post.id);
    }
  }

  // 4. Sync Registrations
  for (const reg of next.registrations) {
    const old = prev.registrations.find((r) => r.id === reg.id);

    if (!old) {
      let fileId = reg.paymentScreenshot || "";

      if (reg.paymentScreenshot && reg.paymentScreenshot.startsWith("data:")) {
        try {
          fileId = await uploadBase64Image(BUCKETS.PAYMENT_PROOFS, reg.paymentScreenshot, "proof");
        } catch (e) {
          console.warn("[Store] Payment screenshot upload failed:", e);
        }
      } else if (reg.paymentScreenshot && reg.paymentScreenshot.includes("/files/")) {
        const match = reg.paymentScreenshot.match(/\/files\/([^\/\?]+)/);
        if (match?.[1]) {
          fileId = match[1];
        }
      }

      const payload = {
        ref: reg.ref,
        eventSlug: reg.eventSlug,
        values: JSON.stringify(reg.values || {}),
        color: reg.color || null,
        paymentScreenshot: fileId || "pending",
        emailSent: reg.emailSent || false,
        confirmed: reg.confirmed || false,
        confirmedAt: reg.confirmedAt || null,
      };

      try {
        await databases.createDocument(DATABASE_ID, COLLECTIONS.REGISTRATIONS, reg.id, payload);
      } catch (err: any) {
        if (err?.code === 409) {
          await databases.updateDocument(DATABASE_ID, COLLECTIONS.REGISTRATIONS, reg.id, payload);
        } else {
          throw err;
        }
      }
    } else {
      // Targeted diff update: only send fields that actually changed
      const diff: Record<string, any> = {};

      if (old.emailSent !== reg.emailSent) {
        diff.emailSent = reg.emailSent ?? false;
      }
      if (old.confirmed !== reg.confirmed) {
        diff.confirmed = reg.confirmed ?? false;
      }
      if (old.confirmedAt !== reg.confirmedAt) {
        diff.confirmedAt = reg.confirmedAt || null;
      }
      if (old.color !== reg.color) {
        diff.color = reg.color || null;
      }
      if (JSON.stringify(old.values) !== JSON.stringify(reg.values)) {
        diff.values = JSON.stringify(reg.values || {});
      }
      if (old.eventSlug !== reg.eventSlug) {
        diff.eventSlug = reg.eventSlug;
      }
      if (old.ref !== reg.ref) {
        diff.ref = reg.ref;
      }
      if (old.paymentScreenshot !== reg.paymentScreenshot) {
        let fileId = reg.paymentScreenshot || "";
        if (reg.paymentScreenshot && reg.paymentScreenshot.startsWith("data:")) {
          try {
            fileId = await uploadBase64Image(BUCKETS.PAYMENT_PROOFS, reg.paymentScreenshot, "proof");
          } catch (e) {
            console.warn("[Store] Payment screenshot upload failed:", e);
          }
        } else if (reg.paymentScreenshot && reg.paymentScreenshot.includes("/files/")) {
          const match = reg.paymentScreenshot.match(/\/files\/([^\/\?]+)/);
          if (match?.[1]) {
            fileId = match[1];
          }
        }
        diff.paymentScreenshot = fileId || "pending";
      }

      if (Object.keys(diff).length > 0) {
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.REGISTRATIONS, reg.id, diff);
      }
    }
  }

  for (const reg of prev.registrations) {
    if (!next.registrations.some((r) => r.id === reg.id)) {
      try {
        await databases.deleteDocument(DATABASE_ID, COLLECTIONS.REGISTRATIONS, reg.id);
      } catch (err: any) {
        // Appwrite document security blocks client SDK delete of guest-created registrations.
        // Fall back to server function with backend API key.
        await deleteRegistrationFn({ data: { registrationId: reg.id } });
      }
    }
  }
}

function setupRealtime() {
  try {
    client.subscribe(
      [
        `databases.${DATABASE_ID}.collections.${COLLECTIONS.EVENTS}.documents`,
        `databases.${DATABASE_ID}.collections.${COLLECTIONS.GALLERY}.documents`,
        `databases.${DATABASE_ID}.collections.${COLLECTIONS.POSTS}.documents`,
        `databases.${DATABASE_ID}.collections.${COLLECTIONS.REGISTRATIONS}.documents`,
      ],
      () => {
        refreshFromAppwrite().catch(() => {});
      }
    );
  } catch {
    // Realtime fallback
  }
}

export function load(): DB {
  if (!cache) {
    cache = emptyDB();
  }
  if (typeof window !== "undefined" && !isInitialized) {
    isInitialized = true;
    refreshFromAppwrite().catch(() => {});
    setupRealtime();
  }
  return cache;
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Executes a state mutation by committing directly to Appwrite before updating local reactive store.
 * Errors from Appwrite are propagated to the caller.
 */
export async function update(fn: (db: DB) => DB | Promise<DB>): Promise<DB> {
  const prev = cache ? { ...cache } : emptyDB();
  const next = normalize(await fn(prev));

  // 1. Commit changes to Appwrite backend first
  await syncToAppwrite(prev, next);

  // 2. Update reactive cache and notify subscribers
  cache = next;
  listeners.forEach((l) => l());

  // 3. Re-sync from server to maintain single source of truth
  refreshFromAppwrite().catch(() => {});

  return next;
}

export function useDB(): DB {
  return useSyncExternalStore(subscribe, load, () => serverSnapshot);
}

/** All registration constraints and reference allocation run against the latest store. */
export async function addRegistration(
  eventSlug: string,
  values: Registration["values"],
  color?: string,
  paymentScreenshot?: string
): Promise<Registration> {
  const currentDb = cache || emptyDB();
  const event = currentDb.events.find((e) => e.slug === eventSlug);
  const registrations = currentDb.registrations.filter((r) => r.eventSlug === eventSlug);

  if (!event || eventStatus(event) !== "open") throw new Error("Registration is closed.");
  if (registrations.length >= event.capacity) throw new Error("All spots are filled.");
  if (!validPaymentScreenshot(paymentScreenshot)) throw new Error("Please upload your UPI Payment Screenshot.");
  if (!event.form.colorPicker) color = undefined;
  if (event.form.colorPicker && (!color || !generateColors(event.capacity).some((c) => c.name === color)))
    throw new Error("Please choose a team color.");
  if (color && registrations.some((r) => r.color === color))
    throw new Error("That color was just taken — please pick another.");

  let fileId = paymentScreenshot || "";
  if (paymentScreenshot && paymentScreenshot.startsWith("data:")) {
    try {
      fileId = await uploadBase64Image(BUCKETS.PAYMENT_PROOFS, paymentScreenshot, "proof");
    } catch (e) {
      console.warn("[Store] Payment screenshot upload failed:", e);
    }
  } else if (paymentScreenshot && paymentScreenshot.includes("/files/")) {
    const match = paymentScreenshot.match(/\/files\/([^\/\?]+)/);
    if (match?.[1]) {
      fileId = match[1];
    }
  }

  const allExistingRefs = currentDb.registrations.map((r) => r.ref);
  const ref = registrationReference(allExistingRefs);
  const regId = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : uid();

  const payload = {
    ref,
    eventSlug,
    values: JSON.stringify(values || {}),
    color: color || null,
    paymentScreenshot: fileId || "pending",
    emailSent: false,
    confirmed: false,
    confirmedAt: null,
  };

  await databases.createDocument(DATABASE_ID, COLLECTIONS.REGISTRATIONS, regId, payload);

  const saved: Registration = {
    id: regId,
    ref,
    eventSlug,
    values,
    color,
    paymentScreenshot: fileId ? getFileUrl(BUCKETS.PAYMENT_PROOFS, fileId) : undefined,
    createdAt: new Date().toISOString(),
  };

  // Update in-memory reactive cache
  if (cache) {
    cache = {
      ...cache,
      registrations: [...cache.registrations, saved],
    };
    listeners.forEach((l) => l());
  }

  // Immediately log reference generation to reference_history
  await logReferenceHistory(ref, eventSlug, regId).catch((err) => {
    console.warn("[Store] Reference history log error:", err);
  });

  return saved;
}

/** Deletes a registration document from Appwrite and updates local reactive store. */
export async function deleteRegistration(id: string): Promise<DB> {
  return update((d) => ({
    ...d,
    registrations: d.registrations.filter((x) => x.id !== id),
  }));
}

/** Logs an administrative action to the admin_history collection. */
export async function logAdminAction(
  action: AdminAction,
  targetType: AdminTargetType,
  targetId: string,
  summary: string,
  metadata?: Record<string, any> | undefined,
  actorOverride?: { id: string; name: string } | undefined
): Promise<void> {
  try {
    let actorId = actorOverride?.id || "admin";
    let actorName = actorOverride?.name || "Club Administrator";

    if (!actorOverride && typeof window !== "undefined") {
      try {
        const user = await account.get();
        actorId = user.$id;
        actorName = user.name || user.email || user.$id;
      } catch {
        // Fallback if session read fails
      }
    }

    const payload = {
      actorId,
      actorName,
      action,
      targetType,
      targetId,
      summary: summary.slice(0, 500),
      metadata: metadata ? JSON.stringify(metadata).slice(0, 4096) : undefined,
      createdAt: new Date().toISOString(),
    };

    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.ADMIN_HISTORY,
      ID.unique(),
      payload
    );
  } catch (err) {
    console.warn("[AdminHistory] Failed to record audit log:", err);
  }
}

/** Resiliently writes a generated tournament reference code to reference_history. */
export async function logReferenceHistory(
  ref: string,
  eventSlug: string,
  registrationId: string,
  ipHint?: string | undefined
): Promise<void> {
  let attempts = 3;
  while (attempts > 0) {
    try {
      await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.REFERENCE_HISTORY,
        ID.unique(),
        {
          ref,
          eventSlug,
          registrationId,
          createdAt: new Date().toISOString(),
          ipHint: ipHint || undefined,
        }
      );
      return;
    } catch (err) {
      attempts--;
      if (attempts === 0) {
        console.error("[ReferenceHistory] Failed to log reference after 3 retries:", err);
      } else {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
  }
}

/** Queries admin_history documents with filtering, sorting, and pagination. */
export async function fetchAdminHistory(params?: {
  limit?: number | undefined;
  offset?: number | undefined;
  actorId?: string | undefined;
  action?: string | undefined;
  targetType?: string | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
}): Promise<{ total: number; entries: AdminHistoryEntry[] }> {
  try {
    const queries = [
      Query.orderDesc("createdAt"),
      Query.limit(params?.limit ?? 25),
      Query.offset(params?.offset ?? 0),
    ];

    if (params?.actorId) {
      queries.push(Query.equal("actorId", params.actorId));
    }
    if (params?.action) {
      queries.push(Query.equal("action", params.action));
    }
    if (params?.targetType) {
      queries.push(Query.equal("targetType", params.targetType));
    }
    if (params?.startDate) {
      queries.push(Query.greaterThanEqual("createdAt", params.startDate));
    }
    if (params?.endDate) {
      queries.push(Query.lessThanEqual("createdAt", params.endDate));
    }

    const res = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.ADMIN_HISTORY,
      queries
    );

    const entries: AdminHistoryEntry[] = res.documents.map((doc: any) => ({
      id: doc.$id,
      actorId: doc.actorId,
      actorName: doc.actorName,
      action: doc.action,
      targetType: doc.targetType,
      targetId: doc.targetId,
      summary: doc.summary,
      metadata: doc.metadata
        ? typeof doc.metadata === "string"
          ? JSON.parse(doc.metadata)
          : doc.metadata
        : undefined,
      createdAt: doc.createdAt || doc.$createdAt,
    }));

    return { total: res.total, entries };
  } catch (err) {
    console.warn("[AdminHistory] Fetch failed:", err);
    return { total: 0, entries: [] };
  }
}

/** Queries reference_history documents for a tournament with sorting and pagination. */
export async function fetchReferenceHistory(params?: {
  eventSlug?: string | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}): Promise<{ total: number; entries: ReferenceHistoryEntry[] }> {
  try {
    const queries = [
      Query.orderDesc("createdAt"),
      Query.limit(params?.limit ?? 50),
      Query.offset(params?.offset ?? 0),
    ];

    if (params?.eventSlug) {
      queries.push(Query.equal("eventSlug", params.eventSlug));
    }

    const res = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.REFERENCE_HISTORY,
      queries
    );

    const entries: ReferenceHistoryEntry[] = res.documents.map((doc: any) => ({
      id: doc.$id,
      ref: doc.ref,
      eventSlug: doc.eventSlug,
      registrationId: doc.registrationId,
      createdAt: doc.createdAt || doc.$createdAt,
      ipHint: doc.ipHint,
    }));

    return { total: res.total, entries };
  } catch (err) {
    console.warn("[ReferenceHistory] Fetch failed:", err);
    return { total: 0, entries: [] };
  }
}

export function useLiveEvents(): LiveEvent[] {
  const db = useDB();
  return useMemo(() => {
    const now = Date.now();
    return db.events.map((e) => ({
      ...e,
      status: eventStatus(e, now),
      registered: db.registrations.filter((r) => r.eventSlug === e.slug).length,
    }));
  }, [db]);
}

/** Resize an uploaded image to a compact JPEG data URL. */
export function fileToImage(
  file: File,
  maxW = 1400,
  quality = 0.8
): Promise<{ src: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Not a valid image"));
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const context = c.getContext("2d");
        if (!context) {
          reject(new Error("Could not resize image"));
          return;
        }
        context.drawImage(img, 0, 0, w, h);
        resolve({ src: c.toDataURL("image/jpeg", quality), width: w, height: h });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
