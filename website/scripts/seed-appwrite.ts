/**
 * Chembuli FC - Seed Appwrite Database
 *
 * Usage:
 *   npx -y tsx scripts/seed-appwrite.ts
 */

const ENDPOINT = process.env.VITE_APPWRITE_ENDPOINT || "https://sgp.cloud.appwrite.io/v1";
const PROJECT_ID = process.env.VITE_APPWRITE_PROJECT_ID || "6ad70b6a00259c48c1b5";
const DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID || "chembuli_db";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@chembulifc.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

// Seed events definition
const seedEvents = [
  {
    slug: "chembuli-sevens-cup-2026",
    name: "Chembuli Sevens Cup",
    tagline: "Seven a side. One crown.",
    format: "7v7 Knockout",
    date: "2026-11-22T10:30:00.000Z",
    closes: "2026-11-15T18:29:00.000Z",
    venue: "Chembuli Turf Arena",
    fee: 1500,
    capacity: 32,
    trophy: "Winners trophy + medals",
    registrationOpen: true,
    poster: "/src/assets/event-1.jpg",
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
    form: {
      title: "Register your team",
      description: "Fill in your team details and pay the entry fee via UPI.",
      fields: [
        { id: "team", label: "Team name", type: "text", required: true, locked: true },
        { id: "captain", label: "Captain name", type: "text", required: true, locked: true },
        { id: "phone", label: "Phone / WhatsApp number", type: "tel", required: true, locked: true },
        { id: "email", label: "Email", type: "email", required: true, locked: true },
        { id: "upi", label: "UPI transaction ID", type: "text", required: true, locked: true },
      ],
      qr: null,
      upiId: "chembuli@upi",
      colorPicker: true,
      colors: [],
      messageEnabled: true,
      message: {
        subject: "You're registered for {event}",
        body: "Hi {captain},\n\nThanks for registering {team} for {event} on {date} at {venue}.\nYour reference ID is {ref}. Your payment is pending verification — the club will confirm your spot shortly.\n\n— Chembuli FC",
      },
    },
  },
  {
    slug: "monsoon-fives-league",
    name: "Monsoon Fives League",
    tagline: "Fast feet. Floodlights.",
    format: "5v5 League",
    date: "2026-12-14T12:00:00.000Z",
    closes: "2026-12-05T18:29:00.000Z",
    venue: "Riverside Futsal Ground",
    fee: 1000,
    capacity: 16,
    trophy: "Winners trophy + medals",
    registrationOpen: false,
    poster: "/src/assets/event-2.jpg",
    sections: [
      {
        id: "rules",
        title: "Rules",
        items: [
          "Squad of up to 8 players",
          "Two halves of 12 minutes",
          "No slide tackles",
        ],
      },
    ],
    schedule: [
      { time: "17:00", label: "Check-in" },
      { time: "17:30", label: "League matches" },
      { time: "21:30", label: "Final" },
    ],
    form: {
      title: "Register your team",
      description: "Fill in your team details and pay the entry fee via UPI.",
      fields: [
        { id: "team", label: "Team name", type: "text", required: true, locked: true },
        { id: "captain", label: "Captain name", type: "text", required: true, locked: true },
        { id: "phone", label: "Phone / WhatsApp number", type: "tel", required: true, locked: true },
        { id: "email", label: "Email", type: "email", required: true, locked: true },
        { id: "upi", label: "UPI transaction ID", type: "text", required: true, locked: true },
      ],
      qr: null,
      upiId: "chembuli@upi",
      colorPicker: true,
      colors: [],
      messageEnabled: true,
      message: {
        subject: "You're registered for {event}",
        body: "Hi {captain},\n\nThanks for registering {team} for {event} on {date} at {venue}.\nYour reference ID is {ref}. Your payment is pending verification — the club will confirm your spot shortly.\n\n— Chembuli FC",
      },
    },
  },
  {
    slug: "founders-trophy-2026",
    name: "Founders Trophy",
    tagline: "Where it all began.",
    format: "11v11 Knockout",
    date: "2026-08-10T09:30:00.000Z",
    closes: "2026-08-01T18:29:00.000Z",
    venue: "Panchayat Ground, Chembuli",
    fee: 2500,
    capacity: 16,
    trophy: "Winners trophy + medals",
    registrationOpen: false,
    poster: "/src/assets/gallery-3.jpg",
    sections: [
      {
        id: "rules",
        title: "Rules",
        items: ["Standard FIFA rules", "Squad of 16"],
      },
    ],
    schedule: [{ time: "15:00", label: "Kick-off" }],
    form: {
      title: "Register your team",
      description: "Fill in your team details and pay the entry fee via UPI.",
      fields: [
        { id: "team", label: "Team name", type: "text", required: true, locked: true },
        { id: "captain", label: "Captain name", type: "text", required: true, locked: true },
        { id: "phone", label: "Phone / WhatsApp number", type: "tel", required: true, locked: true },
        { id: "email", label: "Email", type: "email", required: true, locked: true },
        { id: "upi", label: "UPI transaction ID", type: "text", required: true, locked: true },
      ],
      qr: null,
      upiId: "chembuli@upi",
      colorPicker: true,
      colors: [],
      messageEnabled: true,
      message: {
        subject: "You're registered for {event}",
        body: "Hi {captain},\n\nThanks for registering {team} for {event} on {date} at {venue}.\nYour reference ID is {ref}. Your payment is pending verification — the club will confirm your spot shortly.\n\n— Chembuli FC",
      },
    },
  },
];

// Seed gallery definition
const seedGallery = [
  { id: "g1", src: "/src/assets/gallery-1.jpg", title: "Founders Trophy · Final whistle", width: 1600, height: 1100 },
  { id: "g3", src: "/src/assets/gallery-3.jpg", title: "The save", width: 1000, height: 1300 },
  { id: "g2", src: "/src/assets/gallery-2.jpg", title: "Before kick-off", width: 1400, height: 1000 },
  { id: "e2", src: "/src/assets/event-2.jpg", title: "Sunset fives", width: 1024, height: 1280 },
  { id: "e1", src: "/src/assets/event-1.jpg", title: "Strike", width: 1024, height: 1280 },
  { id: "hero", src: "/src/assets/hero-pitch.jpg", title: "Home ground", width: 1920, height: 1088 },
];

async function main() {
  console.log(`[Seed] Connecting to ${ENDPOINT} (Project: ${PROJECT_ID})...`);

  // 1. Authenticate admin user
  if (!ADMIN_PASSWORD) {
    throw new Error("ADMIN_PASSWORD environment variable is required to run seed script");
  }

  const loginRes = await fetch(`${ENDPOINT}/account/sessions/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Appwrite-Project": PROJECT_ID,
    },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  });

  if (!loginRes.ok) {
    const errText = await loginRes.text();
    throw new Error(`Login failed (${loginRes.status}): ${errText}`);
  }

  const setCookie = loginRes.headers.get("set-cookie") || "";
  const cookieMatch = setCookie.match(/(a_session_[^=]+=[^;]+)/);
  const cookie = cookieMatch ? cookieMatch[1] : "";

  console.log(`[Seed] Authenticated successfully as ${ADMIN_EMAIL}.`);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Appwrite-Project": PROJECT_ID,
  };
  if (cookie) {
    headers["cookie"] = cookie;
  }

  // 2. Seed events
  console.log("\n[Seed] Checking events collection...");
  const eventsListRes = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/events/documents`, { headers });
  const eventsData = await eventsListRes.json();
  const existingEvents: any[] = eventsData.documents || [];
  console.log(`[Seed] Found ${existingEvents.length} existing events.`);

  for (const event of seedEvents) {
    const exists = existingEvents.some((d) => d.slug === event.slug);
    if (exists) {
      console.log(`  -> Event "${event.name}" (${event.slug}) already exists. Skipping.`);
      continue;
    }

    console.log(`  + Creating event "${event.name}"...`);
    const createRes = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/events/documents`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        documentId: event.slug,
        data: {
          slug: event.slug,
          name: event.name,
          tagline: event.tagline,
          format: event.format,
          date: event.date,
          closes: event.closes,
          venue: event.venue,
          venueMap: null,
          fee: event.fee,
          capacity: event.capacity,
          trophy: event.trophy,
          registrationOpen: event.registrationOpen,
          poster: event.poster,
          schedule: JSON.stringify(event.schedule || []),
          sections: JSON.stringify(event.sections || []),
          form: JSON.stringify(event.form || {}),
        },
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      console.error(`    ✗ Failed creating event ${event.name}:`, err);
    } else {
      console.log(`    ✓ Event "${event.name}" created.`);
    }
  }

  // 3. Seed gallery
  console.log("\n[Seed] Checking gallery collection...");
  const galleryListRes = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/gallery/documents`, { headers });
  const galleryData = await galleryListRes.json();
  const existingGallery: any[] = galleryData.documents || [];
  console.log(`[Seed] Found ${existingGallery.length} existing photos.`);

  for (const photo of seedGallery) {
    const exists = existingGallery.some((d) => d.$id === photo.id || d.title === photo.title);
    if (exists) {
      console.log(`  -> Photo "${photo.title}" (${photo.id}) already exists. Skipping.`);
      continue;
    }

    console.log(`  + Creating photo "${photo.title}"...`);
    const createRes = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/gallery/documents`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        documentId: photo.id,
        data: {
          fileId: photo.src,
          title: photo.title,
          width: photo.width,
          height: photo.height,
        },
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      console.error(`    ✗ Failed creating photo ${photo.title}:`, err);
    } else {
      console.log(`    ✓ Photo "${photo.title}" created.`);
    }
  }

  console.log("\n[Seed] All demo events and gallery content successfully migrated to Appwrite!");
}

main().catch((err) => {
  console.error("[Seed] Error:", err);
  process.exit(1);
});
