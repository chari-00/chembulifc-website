import { describe, it, expect } from "vitest";
import type { ClubEvent, Registration } from "@/data/events";
import {
  escapeCsvCell,
  generateRegistrationsCsv,
  getRegistrationsCsvFilename,
} from "../lib/csv-export";

describe("CSV Export Utility (csv-export.ts)", () => {
  const baseMockEvent: ClubEvent = {
    slug: "monsoon-cup-2026",
    name: "Monsoon Cup 2026",
    tagline: "The premier 7v7 monsoon tournament",
    format: "7v7 Knockout",
    date: "2026-07-15T09:00:00.000Z",
    closes: "2026-07-10T18:00:00.000Z",
    venue: "Chembuli Turf Arena, Kochi",
    fee: 3500,
    capacity: 16,
    trophy: "₹25,000 + Trophy",
    registrationOpen: true,
    poster: "/assets/monsoon.jpg",
    schedule: [],
    sections: [],
    form: {
      title: "Team Registration",
      description: "Submit captain and squad details",
      fields: [
        { id: "team", label: "Team Name", type: "text", required: true },
        { id: "captain", label: "Captain Name", type: "text", required: true },
        { id: "phone", label: "Contact Phone", type: "tel", required: true },
        { id: "preferences", label: "Match Slots", type: "checkbox", required: false },
      ],
      qr: null,
      upiId: "chembuli@upi",
      colorPicker: true,
      colors: [
        { name: "Electric Blue", hex: "#1e88e5" },
        { name: "Crimson Red", hex: "#e53935" },
      ],
      message: { subject: "Registration Received", body: "Thank you" },
    },
  };

  const sampleRegistrations: Registration[] = [
    {
      id: "reg-1",
      ref: "CFC-ABC123",
      eventSlug: "monsoon-cup-2026",
      values: {
        team: 'Chembuli "All-Stars", Kochi',
        captain: "Varshan Chari",
        phone: "+91 9876543210",
        preferences: ["Morning Slot", "Custom Kit Needed"],
      },
      color: "Electric Blue",
      createdAt: "2026-06-01T10:00:00.000Z",
      paymentScreenshot: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
      confirmed: true,
      confirmedAt: "2026-06-02T12:00:00.000Z",
    },
    {
      id: "reg-2",
      ref: "CFC-XYZ987",
      eventSlug: "monsoon-cup-2026",
      values: {
        team: "Malabar Strikerz",
        captain: "Rashid Ali",
        phone: "+91 9876543211",
        preferences: "Evening Slot",
      },
      color: "Crimson Red",
      createdAt: "2026-06-03T14:30:00.000Z",
      paymentScreenshot: "",
      confirmed: false,
    },
  ];

  it("escapes CSV cells containing commas, quotes, and newlines properly (RFC 4180)", () => {
    // Standard text with no special characters
    expect(escapeCsvCell("Simple text")).toBe("Simple text");

    // Text containing a comma
    expect(escapeCsvCell("Kochi, Kerala")).toBe('"Kochi, Kerala"');

    // Text containing double quotes
    expect(escapeCsvCell('Derby "Final"')).toBe('"Derby ""Final"""');

    // Text containing both comma and quotes
    expect(escapeCsvCell('Chembuli "All-Stars", Kochi')).toBe('"Chembuli ""All-Stars"", Kochi"');

    // Text containing newlines
    expect(escapeCsvCell("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');

    // Null and undefined values
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell(undefined)).toBe("");
  });

  it("produces correct header order matching form.fields order", () => {
    const csv = generateRegistrationsCsv(baseMockEvent, sampleRegistrations);
    const headerLine = csv.split("\r\n")[0];
    const headers = headerLine.split(",");

    // Fixed first two
    expect(headers[0]).toBe("Reference Code");
    expect(headers[1]).toBe("Submitted At");

    // Dynamic fields in exact form.fields order
    expect(headers[2]).toBe("Team Name");
    expect(headers[3]).toBe("Captain Name");
    expect(headers[4]).toBe("Contact Phone");
    expect(headers[5]).toBe("Match Slots");

    // Trailing fixed columns when colorPicker is true
    expect(headers[6]).toBe("Team Color");
    expect(headers[7]).toBe("Payment Screenshot");
    expect(headers[8]).toBe("Confirmed");
    expect(headers[9]).toBe("Confirmed At");
  });

  it("omits 'Team Color' column when colorPicker is disabled for the event", () => {
    const eventWithoutColors: ClubEvent = {
      ...baseMockEvent,
      form: {
        ...baseMockEvent.form,
        colorPicker: false,
      },
    };

    const csv = generateRegistrationsCsv(eventWithoutColors, sampleRegistrations);
    const headerLine = csv.split("\r\n")[0];
    const headers = headerLine.split(",");

    expect(headers).not.toContain("Team Color");
    expect(headers).toEqual([
      "Reference Code",
      "Submitted At",
      "Team Name",
      "Captain Name",
      "Contact Phone",
      "Match Slots",
      "Payment Screenshot",
      "Confirmed",
      "Confirmed At",
    ]);
  });

  it("correctly joins multi-select checkbox values using delimiter '; '", () => {
    const csv = generateRegistrationsCsv(baseMockEvent, sampleRegistrations);
    const lines = csv.split("\r\n");
    const firstRow = lines[1];

    // Reg 1 has preferences: ["Morning Slot", "Custom Kit Needed"]
    expect(firstRow).toContain("Morning Slot; Custom Kit Needed");
  });

  it("properly marks payment screenshot note as 'Uploaded' or 'Not uploaded' without embedding payload", () => {
    const csv = generateRegistrationsCsv(baseMockEvent, sampleRegistrations);
    const lines = csv.split("\r\n");

    // Reg 1 has screenshot
    expect(lines[1]).toContain("Uploaded");
    expect(lines[1]).not.toContain("data:image");

    // Reg 2 has no screenshot
    expect(lines[2]).toContain("Not uploaded");
  });

  it("generates correct filename with format {event-slug}-registrations-{yyyy-mm-dd}.csv", () => {
    const testDate = new Date("2026-10-20T12:00:00Z");
    const filename = getRegistrationsCsvFilename("weekend-7s-cup", testDate);
    expect(filename).toBe("weekend-7s-cup-registrations-2026-10-20.csv");
  });
});
