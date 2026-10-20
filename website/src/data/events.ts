import event1 from "@/assets/event-1.jpg";
import event2 from "@/assets/event-2.jpg";
import gallery1 from "@/assets/gallery-1.jpg";
import gallery2 from "@/assets/gallery-2.jpg";
import gallery3 from "@/assets/gallery-3.jpg";
import hero from "@/assets/hero-pitch.jpg";

export type EventStatus = "open" | "upcoming" | "completed";

export type FieldType = "text" | "paragraph" | "email" | "tel" | "number" | "date" | "select" | "radio" | "checkbox";

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[] | undefined;
  /** Standard template fields cannot be deleted. */
  locked?: boolean;
  placeholder?: string;
}

export interface TeamColor {
  name: string;
  hex: string;
}

export interface EventForm {
  title: string;
  description: string;
  fields: FormField[];
  qr: string | null;
  upiId: string;
  colorPicker: boolean;
  colors: TeamColor[];
  messageEnabled?: boolean;
  message: { subject: string; body: string };
}

export interface ExtraSection {
  id: string;
  title: string;
  items: string[];
}

export interface ClubEvent {
  slug: string;
  name: string;
  tagline: string;
  format: string;
  date: string; // ISO
  closes: string; // ISO
  venue: string;
  venueMap?: string;
  fee: number;
  capacity: number;
  /** Trophy / prize description shown as text, e.g. "Gold cup + medals". */
  trophy: string;
  /** Admin switch: when on, teams can register until `closes`. */
  registrationOpen: boolean;
  poster: string;
  schedule: { time: string; label: string }[];
  sections: ExtraSection[];
  form: EventForm;
}

export interface LiveEvent extends ClubEvent {
  status: EventStatus;
  registered: number;
}

export interface Registration {
  id: string;
  ref: string;
  eventSlug: string;
  values: Record<string, string | string[]>;
  color?: string | undefined;
  createdAt: string;
  paymentScreenshot?: string | undefined;
  emailSent?: boolean | undefined;
  confirmed?: boolean | undefined;
  confirmedAt?: string | undefined;
}

export interface Photo {
  id: string;
  src: string;
  title: string;
  width: number;
  height: number;
}

export const uid = () => Math.random().toString(36).slice(2, 10);

export function validPaymentScreenshot(value: string | undefined): value is string {
  return !!value && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
}

export function confirmationMessageEnabled(form: EventForm): boolean {
  return form.messageEnabled !== false;
}

export function canConfirmRegistration(form: EventForm, registration: Registration): boolean {
  return !registration.confirmed && (!confirmationMessageEnabled(form) || !!registration.emailSent);
}

export const BASIC_COLORS: TeamColor[] = [
  { name: "White", hex: "#fafafa" },
  { name: "Red", hex: "#e53935" },
  { name: "Blue", hex: "#1e88e5" },
  { name: "Green", hex: "#43a047" },
  { name: "Yellow", hex: "#fdd835" },
  { name: "Orange", hex: "#fb8c00" },
  { name: "Purple", hex: "#8e24aa" },
  { name: "Black", hex: "#111111" },
  { name: "Pink", hex: "#ec407a" },
  { name: "Sky Blue", hex: "#4fc3f7" },
  { name: "Maroon", hex: "#7b1f1f" },
  { name: "Navy", hex: "#1a237e" },
  { name: "Lime", hex: "#c0ca33" },
  { name: "Teal", hex: "#00897b" },
  { name: "Brown", hex: "#6d4c41" },
  { name: "Grey", hex: "#9e9e9e" },
  { name: "Gold", hex: "#d4a017" },
  { name: "Silver", hex: "#c0c0c0" },
  { name: "Cyan", hex: "#00bcd4" },
  { name: "Magenta", hex: "#d81b60" },
  { name: "Olive", hex: "#808000" },
  { name: "Indigo", hex: "#3949ab" },
  { name: "Coral", hex: "#ff7f50" },
  { name: "Mint", hex: "#98ff98" },
];

/** Five spare basic choices beyond team capacity, capped at the basic palette. */
export function generateColors(count: number): TeamColor[] {
  return BASIC_COLORS.slice(0, Math.max(0, Math.floor(count)) + 5);
}

/** Collision-safe within a tournament, even when submissions share a timestamp. */
export function registrationReference(existing: readonly string[], now = Date.now()): string {
  const base = `CFC-${now.toString(36).toUpperCase()}`;
  const taken = new Set(existing);
  let ref = base;
  let suffix = 2;
  while (taken.has(ref)) ref = `${base}-${suffix++}`;
  return ref;
}

/**
 * Defensive cross-tournament reference generation that guarantees uniqueness
 * against a global audit check. If a collision is detected, regenerates until unique.
 */
export function registrationReferenceWithFallback(
  existing: readonly string[],
  isGloballyTaken: (candidate: string) => boolean,
  now = Date.now()
): string {
  let ref = registrationReference(existing, now);
  let offset = 1;
  while (isGloballyTaken(ref)) {
    ref = registrationReference([...existing, ref], now + offset * 1000);
    offset++;
  }
  return ref;
}

export function validVenueMap(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (
      url.hostname === "maps.app.goo.gl" || url.hostname === "maps.google.com" ||
      (url.hostname === "goo.gl" && url.pathname.startsWith("/maps")) ||
      (["google.com", "www.google.com", "google.co.in", "www.google.co.in"].includes(url.hostname) && url.pathname.startsWith("/maps"))
    );
  } catch { return false; }
}

export function standardFields(): FormField[] {
  return [
    { id: "team", label: "Team name", type: "text", required: true, locked: true },
    { id: "captain", label: "Captain name", type: "text", required: true, locked: true },
    { id: "phone", label: "Phone / WhatsApp number", type: "tel", required: true, locked: true },
    { id: "email", label: "Email", type: "email", required: true, locked: true },
    { id: "upi", label: "UPI transaction ID", type: "text", required: true, locked: true },
  ];
}

export function defaultForm(capacity: number): EventForm {
  return {
    title: "Register your team",
    description: "Fill in your team details and pay the entry fee via UPI.",
    fields: standardFields(),
    qr: null,
    upiId: "",
    colorPicker: true,
    colors: generateColors(capacity),
    messageEnabled: true,
    message: {
      subject: "You're registered for {event}",
      body: "Hi {captain},\n\nThanks for registering {team} for {event} on {date} at {venue}.\nYour reference ID is {ref}. Your payment is pending verification — the club will confirm your spot shortly.\n\n— Chembuli FC",
    },
  };
}

export function blankEvent(): ClubEvent {
  const d = new Date(Date.now() + 30 * 864e5);
  d.setHours(16, 0, 0, 0);
  const c = new Date(d.getTime() - 7 * 864e5);
  return {
    slug: "",
    name: "",
    tagline: "",
    format: "7v7 Knockout",
    date: d.toISOString(),
    closes: c.toISOString(),
    venue: "",
    fee: 1000,
    capacity: 16,
    trophy: "Winners trophy + medals",
    registrationOpen: true,
    poster: hero,
    schedule: [{ time: "16:00", label: "Kick-off" }],
    sections: [{ id: uid(), title: "Rules", items: ["Referee decisions are final"] }],
    form: defaultForm(16),
  };
}

// Sample events — the admin can edit or delete these.
export const seedEvents: ClubEvent[] = [
  {
    slug: "chembuli-sevens-cup-2026",
    name: "Chembuli Sevens Cup",
    tagline: "Seven a side. One crown.",
    format: "7v7 Knockout",
    date: "2026-11-22T16:00:00+05:30",
    closes: "2026-11-15T23:59:00+05:30",
    venue: "Chembuli Turf Arena",
    fee: 1500,
    capacity: 32,
    trophy: "Winners trophy + medals",
    registrationOpen: true,
    poster: event1,
    sections: [
      {
        id: "rules",
        title: "Rules",
        items: [
          "Squad of up to 10 players, 7 on pitch",
          "Two halves of 15 minutes each",
          "Rolling substitutions allowed",
          "Shin guards mandatory",
          "Referee decisions are final",
        ],
      },
    ],
    schedule: [
      { time: "15:00", label: "Team check-in" },
      { time: "16:00", label: "Group stage kick-off" },
      { time: "20:30", label: "Semi-finals" },
      { time: "22:00", label: "Final & awards" },
    ],
    form: defaultForm(32),
  },
  {
    slug: "monsoon-fives-league",
    name: "Monsoon Fives League",
    tagline: "Fast feet. Floodlights.",
    format: "5v5 League",
    date: "2026-12-14T17:30:00+05:30",
    closes: "2026-12-05T23:59:00+05:30",
    venue: "Riverside Futsal Ground",
    fee: 1000,
    capacity: 16,
    trophy: "Winners trophy + medals",
    registrationOpen: false,
    poster: event2,
    sections: [{ id: "rules", title: "Rules", items: ["Squad of up to 8 players", "Two halves of 12 minutes", "No slide tackles"] }],
    schedule: [
      { time: "17:00", label: "Check-in" },
      { time: "17:30", label: "League matches" },
      { time: "21:30", label: "Final" },
    ],
    form: defaultForm(16),
  },
  {
    slug: "founders-trophy-2026",
    name: "Founders Trophy",
    tagline: "Where it all began.",
    format: "11v11 Knockout",
    date: "2026-08-10T15:00:00+05:30",
    closes: "2026-08-01T23:59:00+05:30",
    venue: "Panchayat Ground, Chembuli",
    fee: 2500,
    capacity: 16,
    trophy: "Winners trophy + medals",
    registrationOpen: false,
    poster: gallery3,
    sections: [{ id: "rules", title: "Rules", items: ["Standard FIFA rules", "Squad of 16"] }],
    schedule: [{ time: "15:00", label: "Kick-off" }],
    form: defaultForm(16),
  },
];

export const seedGallery: Photo[] = [
  { id: "g1", src: gallery1, title: "Founders Trophy · Final whistle", width: 1600, height: 1100 },
  { id: "g3", src: gallery3, title: "The save", width: 1000, height: 1300 },
  { id: "g2", src: gallery2, title: "Before kick-off", width: 1400, height: 1000 },
  { id: "e2", src: event2, title: "Sunset fives", width: 1024, height: 1280 },
  { id: "e1", src: event1, title: "Strike", width: 1024, height: 1280 },
  { id: "hero", src: hero, title: "Home ground", width: 1920, height: 1088 },
];

/** Status is derived: past date → completed; admin-open and before close → open; otherwise upcoming. */
export function eventStatus(e: ClubEvent, now: number = Date.now()): EventStatus {
  if (new Date(e.date).getTime() < now) return "completed";
  if (e.registrationOpen && new Date(e.closes).getTime() > now) return "open";
  return "upcoming";
}

/** Next event that hasn't happened yet (soonest first), or null. */
export function nextEvent<T extends ClubEvent>(list: T[], now: number = Date.now()): T | null {
  return (
    list
      .filter((e) => new Date(e.date).getTime() >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] ?? null
  );
}

export const statusLabel: Record<EventStatus, string> = {
  open: "Registration open",
  upcoming: "Coming soon",
  completed: "Completed",
};

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function fillMessage(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);
}
