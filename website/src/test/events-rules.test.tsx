import { describe, expect, it } from "vitest";
import { blankEvent, eventStatus, generateColors, nextEvent, registrationReference, registrationReferenceWithFallback, validVenueMap, confirmationMessageEnabled, canConfirmRegistration, validPaymentScreenshot, type Registration } from "@/data/events";
import { addRegistration, update, useDB } from "@/lib/store";
import { renderHook } from "@testing-library/react";

const at = (iso: string) => new Date(iso).getTime();

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
  function prepare(colorPicker: boolean) {
    const event = { ...blankEvent(), slug: "payment-test", date: "2099-12-31T00:00:00Z", closes: "2099-12-30T00:00:00Z" };
    event.form.colorPicker = colorPicker;
    update((db) => ({ ...db, events: [event], registrations: [] }));
  }
  it("requires a UPI Payment Screenshot on submission", () => {
    prepare(false);
    expect(() => addRegistration("payment-test", {})).toThrow("UPI Payment Screenshot");
  });
  it("rejects non-image payment evidence", () => {
    prepare(false);
    expect(() => addRegistration("payment-test", {}, undefined, "data:text/html;base64,aGVsbG8=")).toThrow("UPI Payment Screenshot");
    expect(validPaymentScreenshot(screenshot)).toBe(true);
  });
  it("stores uploaded payment evidence with the registration", () => {
    prepare(false);
    const saved = addRegistration("payment-test", { team: "Screenshot United" }, undefined, screenshot);
    const { result, unmount } = renderHook(() => useDB());
    expect(result.current.registrations.find((r) => r.id === saved.id)?.paymentScreenshot).toBe(screenshot);
    unmount();
  });
  it("ignores team colors when the switch is off", () => {
    prepare(false);
    expect(addRegistration("payment-test", {}, "Red", screenshot).color).toBeUndefined();
    expect(addRegistration("payment-test", {}, undefined, screenshot).ref).toMatch(/^CFC/);
  });
  it("requires a team color when the switch is on", () => {
    prepare(true);
    expect(() => addRegistration("payment-test", {}, undefined, screenshot)).toThrow("choose a team color");
    expect(addRegistration("payment-test", {}, "Red", screenshot).color).toBe("Red");
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
