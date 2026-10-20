import { Client, Databases, Storage, Account } from "appwrite";

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || "https://sgp.cloud.appwrite.io/v1";
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID || "6ad70b6a00259c48c1b5";

export const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId);

export const databases = new Databases(client);
export const storage = new Storage(client);
export const account = new Account(client);

export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || "chembuli_db";

export const COLLECTIONS = {
  EVENTS: "events",
  REGISTRATIONS: "registrations",
  GALLERY: "gallery",
  POSTS: "posts",
  ADMIN_HISTORY: "admin_history",
  REFERENCE_HISTORY: "reference_history",
} as const;

export const BUCKETS = {
  PAYMENT_PROOFS: "payment_proofs",
  GALLERY_PHOTOS: "gallery_photos",
  BLOG_IMAGES: "blog_images",
} as const;
