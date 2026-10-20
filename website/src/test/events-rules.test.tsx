import { describe, expect, it, vi, afterEach } from "vitest";
import { blankEvent, eventStatus, generateColors, nextEvent, registrationReference, registrationReferenceWithFallback, validVenueMap, confirmationMessageEnabled, canConfirmRegistration, validPaymentScreenshot, type Registration } from "@/data/events";
import { addRegistration, refreshFromAppwrite, update, useDB } from "@/lib/store";
import { databases, storage, COLLECTIONS, BUCKETS } from "@/lib/appwrite";
import { renderHook, act } from "@testing-library/react";

const at = (iso: string) => new Date(iso).getTime();

afterEach(() => {
  vi.restoreAllMocks();
});

describe("event rules", () => {
  it("marks an event completed once its date has passed", () => {
    const e = { ...blankEvent(), date: "2026-01-10T10:00:00Z", closes: "2026-01-05T10:00:00Z" };
    expect(eventStatus(e, at("2026-01-11T00:00:00Z"))).toBe("completed");
  });
  it("is open only while admin-open and before closing", () => {
    const e = { ...blankEvent(), date: "2026-01-10T10:00:00Z", closes: "2026-01-05T10:00:00Z", registrationOpen: true };
    expect(eventStatus(e, at("2026-01-01T00:00:00Z"))).toBe("open");
    expect(eventStatus(e, at("2026-01-06T00:00:00Z"))).toBe("upcoming");
  });
  it("next kick-off is the soonest event not yet played", () => {
    const a = { ...blankEvent(), slug: "a", date: "2026-03-01T00:00:00Z" };
    const b = { ...blankEvent(), slug: "b", date: "2026-02-01T00:00:00Z" };
    const past = { ...blankEvent(), slug: "p", date: "2025-12-01T00:00:00Z" };
    expect(nextEvent([a, past, b], at("2026-01-01T00:00:00Z"))?.slug).toBe("b");
  });
  it("offers 13 basic colors for 8 teams", () => {
    const c = generateColors(8);
    expect(c).toHaveLength(13);
    expect(new Set(c.map((x) => x.name)).size).toBe(13);
    expect(c[0]?.name).toBe("White");
  });
  it("offers 21 basic colors for 16 teams", () => {
    expect(generateColors(16)).toHaveLength(21);
  });
  it("starts every new reference with CFC", () => {
    expect(registrationReference([], 1000).startsWith("CFC")).toBe(true);
  });
  it("cannot duplicate a reference in one tournament at the same timestamp", () => {
    const refs: string[] = [];
    for (let i = 0; i < 100; i++) refs.push(registrationReference(refs, 1000));
    expect(new Set(refs).size).toBe(100);
  });
  it("accepts an admin Google Maps location and rejects unsafe links", () => {
    expect(validVenueMap("https://maps.app.goo.gl/club")).toBe(true);
    expect(validVenueMap("javascript:alert(1)")).toBe(false);
    expect(validVenueMap("https://example.com/maps")).toBe(false);
  });
  it("never invents non-basic colors for big events", () => {
    expect(generateColors(40).every((x) => !x.name.startsWith("Color "))).toBe(true);
  });
  it("simulates a global reference collision and confirms defensive regeneration", () => {
    const fixedTime = 1700000000000;
    const initialCandidate = registrationReference([], fixedTime);

    // Simulate global history having this initial candidate already
    const globalHistory = new Set([initialCandidate]);
    const isGloballyTaken = (cand: string) => globalHistory.has(cand);

    // Generate with defensive fallback
    const resolvedRef = registrationReferenceWithFallback([], isGloballyTaken, fixedTime);

    // Must be regenerated to a new distinct code
    expect(resolvedRef).not.toBe(initialCandidate);
    expect(resolvedRef.startsWith("CFC-")).toBe(true);
    expect(isGloballyTaken(resolvedRef)).toBe(false);
  });
});

describe("registration options", () => {
  const screenshot = "data:image/png;base64,aGVsbG8=";
  const registration: Registration = { id: "r", ref: "CFC-TEST", eventSlug: "test", values: {}, createdAt: "2026-10-19T00:00:00Z" };

  async function prepare(colorPicker: boolean) {
    vi.spyOn(databases, "createDocument").mockResolvedValue({} as any);
    vi.spyOn(databases, "updateDocument").mockResolvedValue({} as any);
    vi.spyOn(databases, "deleteDocument").mockResolvedValue({} as any);
    vi.spyOn(storage, "createFile").mockResolvedValue({ $id: "mock-file-id" } as any);

    const event = {
      ...blankEvent(),
      slug: "payment-test",
      date: "2099-12-31T10:00:00Z",
      closes: "2099-12-30T10:00:00Z",
      registrationOpen: true,
    };
    event.form.colorPicker = colorPicker;
    await act(async () => {
      await update((db) => ({ ...db, events: [event], registrations: [] }));
    });
  }

  it("requires a UPI Payment Screenshot on submission", async () => {
    await prepare(false);
    await expect(addRegistration("payment-test", {})).rejects.toThrow("UPI Payment Screenshot");
  });

  it("rejects non-image payment evidence", async () => {
    await prepare(false);
    await expect(addRegistration("payment-test", {}, undefined, "data:text/html;base64,aGVsbG8=")).rejects.toThrow("UPI Payment Screenshot");
    expect(validPaymentScreenshot(screenshot)).toBe(true);
  });

  it("stores uploaded payment evidence with the registration", async () => {
    await prepare(false);
    const saved = await addRegistration("payment-test", { team: "Screenshot United" }, undefined, screenshot);
    const { result, unmount } = renderHook(() => useDB());
    expect(result.current.registrations.find((r) => r.id === saved.id)?.paymentScreenshot).toBeDefined();
    unmount();
  });

  it("ignores team colors when the switch is off", async () => {
    await prepare(false);
    expect((await addRegistration("payment-test", {}, "Red", screenshot)).color).toBeUndefined();
    expect((await addRegistration("payment-test", {}, undefined, screenshot)).ref).toMatch(/^CFC/);
  });

  it("requires a team color when the switch is on", async () => {
    await prepare(true);
    await expect(addRegistration("payment-test", {}, undefined, screenshot)).rejects.toThrow("choose a team color");
    expect((await addRegistration("payment-test", {}, "Red", screenshot)).color).toBe("Red");
  });

  it("ignores confirmation messages and email gating when switched off", () => {
    const form = { ...blankEvent().form, messageEnabled: false };
    expect(confirmationMessageEnabled(form)).toBe(false);
    expect(canConfirmRegistration(form, registration)).toBe(true);
  });

  it("requires sent email for confirmation when messages are switched on", () => {
    const form = { ...blankEvent().form, messageEnabled: true };
    expect(confirmationMessageEnabled(form)).toBe(true);
    expect(canConfirmRegistration(form, registration)).toBe(false);
    expect(canConfirmRegistration(form, { ...registration, emailSent: true })).toBe(true);
  });
});

describe("event deletion persistence (Bug 1 regression check)", () => {
  it("a deleted event does not reappear after cache refresh / reload", async () => {
    vi.spyOn(databases, "createDocument").mockResolvedValue({} as any);
    vi.spyOn(databases, "updateDocument").mockResolvedValue({} as any);
    vi.spyOn(databases, "deleteDocument").mockResolvedValue({} as any);

    // 1. Setup store with two events
    const ev1 = { ...blankEvent(), slug: "keep-cup", name: "Keep Cup" };
    const ev2 = { ...blankEvent(), slug: "delete-cup", name: "Delete Cup" };
    await act(async () => {
      await update((db) => ({ ...db, events: [ev1, ev2] }));
    });

    const { result, unmount } = renderHook(() => useDB());
    expect(result.current.events.map((e) => e.slug)).toContain("delete-cup");

    // 2. Admin deletes "delete-cup"
    await act(async () => {
      await update((db) => ({
        ...db,
        events: db.events.filter((e) => e.slug !== "delete-cup"),
      }));
    });
    expect(result.current.events.map((e) => e.slug)).not.toContain("delete-cup");
    expect(result.current.events.map((e) => e.slug)).toEqual(["keep-cup"]);

    // 3. Mock Appwrite returning live state (only "keep-cup" exists in Appwrite)
    const listSpy = vi.spyOn(databases, "listDocuments").mockImplementation(async (_dbId, colId) => {
      if (colId === COLLECTIONS.EVENTS) {
        return {
          total: 1,
          documents: [
            {
              $id: "keep-cup",
              slug: "keep-cup",
              name: "Keep Cup",
              tagline: "Live tournament",
              format: "7v7",
              date: "2026-12-01T10:00:00Z",
              closes: "2026-11-20T10:00:00Z",
              venue: "Chembuli Turf",
              fee: 1000,
              capacity: 16,
              trophy: "Trophy",
              registrationOpen: true,
              poster: "/poster.jpg",
              schedule: "[]",
              sections: "[]",
              form: "{}",
            },
          ],
        } as any;
      }
      return { total: 0, documents: [] } as any;
    });

    // 4. Trigger refreshFromAppwrite (as happens on reload / realtime update)
    await act(async () => {
      await refreshFromAppwrite();
    });

    // 5. Verify "delete-cup" has NOT reappeared, and seed data is NOT resurrected
    expect(result.current.events.map((e) => e.slug)).toEqual(["keep-cup"]);
    expect(result.current.events.map((e) => e.slug)).not.toContain("delete-cup");

    // 6. Even if Appwrite returns 0 events (all deleted), it must reflect empty array, NOT fallback to seedEvents
    listSpy.mockImplementation(async () => ({ total: 0, documents: [] } as any));
    await act(async () => {
      await refreshFromAppwrite();
    });
    expect(result.current.events).toEqual([]);

    listSpy.mockRestore();
    unmount();
  });
});

describe("cross-session cloud persistence regression checks (Symptoms A, C, E)", () => {
  it("persists created tournament with base64 poster by uploading to storage, keeping poster under 512 chars", async () => {
    const uploadSpy = vi.spyOn(storage, "createFile").mockResolvedValue({ $id: "cloud-poster-id-99" } as any);
    const createDocSpy = vi.spyOn(databases, "createDocument").mockResolvedValue({} as any);

    // Large base64 data URI (> 512 characters)
    const bigPosterDataUri = "data:image/jpeg;base64," + "A".repeat(2000);

    const newTournament = {
      ...blankEvent(),
      slug: "persisted-cup",
      name: "Persisted Cup",
      poster: bigPosterDataUri,
    };

    await act(async () => {
      await update((db) => ({ ...db, events: [newTournament] }));
    });

    // 1. Verify poster was uploaded to Appwrite Storage BUCKETS.GALLERY_PHOTOS
    expect(uploadSpy).toHaveBeenCalledWith(
      BUCKETS.GALLERY_PHOTOS,
      expect.any(String),
      expect.any(Object)
    );

    // 2. Verify payload sent to Appwrite database has a clean short poster URL (< 512 chars)
    expect(createDocSpy).toHaveBeenCalledWith(
      expect.any(String),
      COLLECTIONS.EVENTS,
      "persisted-cup",
      expect.objectContaining({
        slug: "persisted-cup",
        name: "Persisted Cup",
        poster: expect.stringMatching(/cloud-poster-id-99/),
      })
    );

    const callArgs = createDocSpy.mock.calls.find((c) => c[1] === COLLECTIONS.EVENTS && c[2] === "persisted-cup");
    const payload = callArgs?.[3] as { poster: string };
    expect(payload.poster.length).toBeLessThan(512);

    // 3. Simulate another browser/device loading the site: fresh fetch from Appwrite
    vi.spyOn(databases, "listDocuments").mockImplementation(async (_dbId, colId) => {
      if (colId === COLLECTIONS.EVENTS) {
        return {
          total: 1,
          documents: [
            {
              $id: "persisted-cup",
              slug: "persisted-cup",
              name: "Persisted Cup",
              tagline: "",
              format: "7v7",
              date: "2026-12-01T10:00:00Z",
              closes: "2026-11-20T10:00:00Z",
              venue: "Chembuli Ground",
              fee: 500,
              capacity: 8,
              trophy: "Trophy",
              registrationOpen: true,
              poster: payload.poster,
              schedule: "[]",
              sections: "[]",
              form: "{}",
            },
          ],
        } as any;
      }
      return { total: 0, documents: [] } as any;
    });

    await act(async () => {
      await refreshFromAppwrite();
    });

    const { result, unmount } = renderHook(() => useDB());
    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0]?.slug).toBe("persisted-cup");
    expect(result.current.events[0]?.name).toBe("Persisted Cup");
    expect(result.current.events[0]?.poster).toContain("cloud-poster-id-99");

    uploadSpy.mockRestore();
    createDocSpy.mockRestore();
    unmount();
  });

  it("unblocks public guests when registrations listDocuments throws 401 Unauthorized", async () => {
    // Simulate Appwrite returning 401 Unauthorized for public visitors querying registrations
    vi.spyOn(databases, "listDocuments").mockImplementation(async (_dbId, colId) => {
      if (colId === COLLECTIONS.REGISTRATIONS) {
        const error: any = new Error("The current user is not authorized to perform the requested action.");
        error.code = 401;
        throw error;
      }
      if (colId === COLLECTIONS.EVENTS) {
        return {
          total: 1,
          documents: [
            {
              $id: "public-viewable-cup",
              slug: "public-viewable-cup",
              name: "Public Viewable Cup",
              tagline: "Open to all",
              format: "7v7",
              date: "2026-12-01T10:00:00Z",
              closes: "2026-11-20T10:00:00Z",
              venue: "Chembuli Turf",
              fee: 1000,
              capacity: 16,
              trophy: "Cup",
              registrationOpen: true,
              poster: "/poster.jpg",
              schedule: "[]",
              sections: "[]",
              form: "{}",
            },
          ],
        } as any;
      }
      if (colId === COLLECTIONS.GALLERY) {
        return {
          total: 1,
          documents: [
            {
              $id: "photo-1",
              fileId: "file-photo-1",
              title: "Trophy Celebration",
              width: 1200,
              height: 800,
            },
          ],
        } as any;
      }
      return { total: 0, documents: [] } as any;
    });

    // Public visitor refresh must NOT throw and must load events and gallery
    await expect(refreshFromAppwrite()).resolves.not.toThrow();

    const { result, unmount } = renderHook(() => useDB());
    expect(result.current.events.map((e) => e.slug)).toContain("public-viewable-cup");
    expect(result.current.gallery.map((g) => g.title)).toContain("Trophy Celebration");
    expect(result.current.registrations).toEqual([]);

    unmount();
  });

  it("updates gallery photo title without corrupting fileId with full 124-char view URL", async () => {
    const createDocSpy = vi.spyOn(databases, "createDocument").mockResolvedValue({} as any);
    const updateDocSpy = vi.spyOn(databases, "updateDocument").mockResolvedValue({} as any);
    const deleteDocSpy = vi.spyOn(databases, "deleteDocument").mockResolvedValue({} as any);

    // Initial photo loaded from Appwrite
    const photo = {
      id: "photo-123",
      src: "https://sgp.cloud.appwrite.io/v1/storage/buckets/gallery_photos/files/file-abc-999/view?project=6ad70b6a00259c48c1b5",
      title: "Old Title",
      width: 1200,
      height: 800,
    };

    await act(async () => {
      await update((db) => ({ ...db, events: [], gallery: [photo] }));
    });

    // Admin updates photo title
    const renamedPhoto = { ...photo, title: "Renamed Title" };
    await act(async () => {
      await update((db) => ({ ...db, events: [], gallery: [renamedPhoto] }));
    });

    // Verify updateDocument was called with extracted fileId "file-abc-999", NOT the 124-char URL
    expect(updateDocSpy).toHaveBeenCalledWith(
      expect.any(String),
      COLLECTIONS.GALLERY,
      "photo-123",
      expect.objectContaining({
        fileId: "file-abc-999",
        title: "Renamed Title",
      })
    );

    const callArgs = updateDocSpy.mock.calls.find((c) => c[1] === COLLECTIONS.GALLERY && c[2] === "photo-123");
    const payload = callArgs?.[3] as { fileId: string };
    expect(payload.fileId).toBe("file-abc-999");
    expect(payload.fileId.length).toBeLessThan(50);

    createDocSpy.mockRestore();
    updateDocSpy.mockRestore();
  });
});

