import { Client as ServerClient, Databases, Query } from "node-appwrite";

function getRegistrationsServerSdk() {
  const endpoint = (process.env["VITE_APPWRITE_ENDPOINT"] as string) || "https://sgp.cloud.appwrite.io/v1";
  const projectId = (process.env["VITE_APPWRITE_PROJECT_ID"] as string) || "6ad70b6a00259c48c1b5";
  const apiKey = process.env["APPWRITE_API_KEY"];
  const databaseId = (process.env["VITE_APPWRITE_DATABASE_ID"] as string) || "chembuli_db";

  if (!apiKey) {
    throw new Error("APPWRITE_API_KEY is not configured in .env");
  }

  const client = new ServerClient().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  return {
    client,
    databases: new Databases(client),
    databaseId,
  };
}

export async function listRegistrationsServerHandler() {
  const { databases, databaseId } = getRegistrationsServerSdk();
  const res = await databases.listDocuments(databaseId, "registrations", [Query.limit(500)]);
  return { documents: res.documents };
}

export async function deleteRegistrationServerHandler(registrationId: string) {
  if (!registrationId) throw new Error("registrationId is required");
  const { databases, databaseId } = getRegistrationsServerSdk();
  await databases.deleteDocument(databaseId, "registrations", registrationId);
  return { success: true };
}
