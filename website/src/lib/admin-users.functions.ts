import { createServerFn } from "@tanstack/react-start";
import { Client as ServerClient, Users, Teams, Account, Databases, ID } from "node-appwrite";

export interface AdminUserRecord {
  $id: string;
  name: string;
  email: string;
  $createdAt: string;
  accessedAt?: string | undefined;
  labels: string[];
  isSuperAdmin: boolean;
  membershipId?: string | undefined;
  status: boolean;
}

function getAdminServerSdk() {
  const endpoint = (process.env["VITE_APPWRITE_ENDPOINT"] as string) || "https://sgp.cloud.appwrite.io/v1";
  const projectId = (process.env["VITE_APPWRITE_PROJECT_ID"] as string) || "6ad70b6a00259c48c1b5";
  const apiKey = process.env["APPWRITE_API_KEY"];

  if (!apiKey) {
    throw new Error(
      "APPWRITE_API_KEY is not configured in .env. Please generate an API Key in Appwrite Console (scopes: users.read, users.write, teams.read, teams.write) and add it to website/.env"
    );
  }

  const client = new ServerClient()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);

  return {
    client,
    users: new Users(client),
    teams: new Teams(client),
    databases: new Databases(client),
  };
}

async function recordServerAdminHistory(
  caller: any,
  action: string,
  targetType: string,
  targetId: string,
  summary: string,
  metadata?: Record<string, any>
) {
  try {
    const { databases } = getAdminServerSdk();
    const databaseId = (process.env["VITE_APPWRITE_DATABASE_ID"] as string) || "chembuli_db";
    await databases.createDocument(
      databaseId,
      "admin_history",
      ID.unique(),
      {
        actorId: caller.$id,
        actorName: caller.name || caller.email || caller.$id,
        action,
        targetType,
        targetId,
        summary: summary.slice(0, 500),
        metadata: metadata ? JSON.stringify(metadata).slice(0, 4096) : undefined,
        createdAt: new Date().toISOString(),
      }
    );
  } catch (err) {
    console.warn("[ServerAdminHistory] Failed to log action:", err);
  }
}

async function verifySuperAdminCaller(jwt: string) {
  const endpoint = (process.env["VITE_APPWRITE_ENDPOINT"] as string) || "https://sgp.cloud.appwrite.io/v1";
  const projectId = (process.env["VITE_APPWRITE_PROJECT_ID"] as string) || "6ad70b6a00259c48c1b5";

  if (!jwt) {
    throw new Error("Authentication token is required");
  }

  const client = new ServerClient()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setJWT(jwt);

  const account = new Account(client);
  const caller = await account.get();

  const isSuper = (caller.labels || []).includes("superadmin") || caller.$id === "chari";
  if (!isSuper) {
    throw new Error("Forbidden: Super-admin privileges are required for this action.");
  }

  return caller;
}

export const listAdminsFn = createServerFn({ method: "POST" })
  .inputValidator((d: { jwt: string }) => {
    if (!d?.jwt) throw new Error("JWT token is required");
    return d;
  })
  .handler(async ({ data }) => {
    await verifySuperAdminCaller(data.jwt);
    const { users, teams } = getAdminServerSdk();

    const memberships = await teams.listMemberships("admins");

    const admins: AdminUserRecord[] = await Promise.all(
      memberships.memberships.map(async (m) => {
        try {
          const u = await users.get(m.userId);
          const isSuper = (u.labels || []).includes("superadmin") || u.$id === "chari";
          return {
            $id: u.$id,
            name: u.name || m.userName,
            email: u.email || m.userEmail,
            $createdAt: u.$createdAt || m.$createdAt,
            accessedAt: u.accessedAt || m.userAccessedAt || undefined,
            labels: u.labels || [],
            isSuperAdmin: isSuper,
            membershipId: m.$id,
            status: u.status,
          };
        } catch {
          return {
            $id: m.userId,
            name: m.userName,
            email: m.userEmail,
            $createdAt: m.$createdAt,
            accessedAt: m.userAccessedAt || undefined,
            labels: [],
            isSuperAdmin: m.userId === "chari",
            membershipId: m.$id,
            status: true,
          };
        }
      })
    );

    // Sort chari first, then newest
    admins.sort((a, b) => {
      if (a.$id === "chari") return -1;
      if (b.$id === "chari") return 1;
      return new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime();
    });

    return { admins };
  });

export const createAdminFn = createServerFn({ method: "POST" })
  .inputValidator((d: { jwt: string; name: string; email: string; password: string }) => {
    if (!d?.jwt) throw new Error("JWT token is required");
    if (!d?.name?.trim()) throw new Error("Full name is required");
    if (!d?.email?.trim() || !d.email.includes("@")) throw new Error("Valid email is required");
    if (!d?.password || d.password.length < 8) throw new Error("Password must be at least 8 characters");
    return {
      jwt: d.jwt,
      name: d.name.trim(),
      email: d.email.trim().toLowerCase(),
      password: d.password,
    };
  })
  .handler(async ({ data }) => {
    const caller = await verifySuperAdminCaller(data.jwt);
    const { users, teams } = getAdminServerSdk();

    const newUserId = ID.unique();

    // Create user in Appwrite Auth. Notice: NO superadmin label is added.
    const user = await users.create(
      newUserId,
      data.email,
      undefined,
      data.password,
      data.name
    );

    // Add user to 'admins' Team with role ['admin']
    const membership = await teams.createMembership({
      teamId: "admins",
      roles: ["admin"],
      email: data.email,
      userId: user.$id,
      name: data.name,
    });

    await recordServerAdminHistory(
      caller,
      "admin.create",
      "admin",
      user.$id,
      `Enrolled new administrator "${data.name}" (${data.email}) in team "admins"`,
      { name: data.name, email: data.email, userId: user.$id }
    );

    return {
      success: true,
      user: {
        $id: user.$id,
        name: user.name,
        email: user.email,
        $createdAt: user.$createdAt,
        labels: user.labels,
        isSuperAdmin: false,
        membershipId: membership.$id,
        status: user.status,
      },
    };
  });

export const updateAdminFn = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      jwt: string;
      userId: string;
      name?: string | undefined;
      email?: string | undefined;
      password?: string | undefined;
    }) => {
      if (!d?.jwt) throw new Error("JWT token is required");
      if (!d?.userId?.trim()) throw new Error("User ID is required");
      return d;
    }
  )
  .handler(async ({ data }) => {
    const caller = await verifySuperAdminCaller(data.jwt);
    const { users } = getAdminServerSdk();

    const targetUser = await users.get(data.userId);

    // Hard-lock: If target is chari or has superadmin label, ensure protected status
    if (targetUser.$id === "chari" || targetUser.labels?.includes("superadmin")) {
      if (data.name?.trim()) {
        await users.updateName(data.userId, data.name.trim());
      }
      if (data.email?.trim() && data.email.trim().toLowerCase() !== targetUser.email.toLowerCase()) {
        await users.updateEmail(data.userId, data.email.trim().toLowerCase());
      }
      if (data.password?.trim()) {
        if (data.password.length < 8) {
          throw new Error("Password must be at least 8 characters");
        }
        await users.updatePassword(data.userId, data.password);
      }
      await recordServerAdminHistory(
        caller,
        "admin.update",
        "admin",
        data.userId,
        `Updated super-admin details for "${targetUser.name || data.userId}"`,
        { userId: data.userId, name: data.name, email: data.email, passwordReset: Boolean(data.password) }
      );
      return { success: true };
    }

    if (data.name?.trim()) {
      await users.updateName(data.userId, data.name.trim());
    }

    // Guard: Only update email if it is actually different to prevent 409 user_target_already_exists
    if (data.email?.trim() && data.email.trim().toLowerCase() !== targetUser.email.toLowerCase()) {
      await users.updateEmail(data.userId, data.email.trim().toLowerCase());
    }

    if (data.password?.trim()) {
      if (data.password.length < 8) {
        throw new Error("Password must be at least 8 characters");
      }
      await users.updatePassword(data.userId, data.password);
    }

    await recordServerAdminHistory(
      caller,
      "admin.update",
      "admin",
      data.userId,
      `Updated details / password for administrator "${targetUser.name || data.userId}"`,
      { userId: data.userId, name: data.name, email: data.email, passwordReset: Boolean(data.password) }
    );

    return { success: true };
  });

export const deleteAdminFn = createServerFn({ method: "POST" })
  .inputValidator((d: { jwt: string; userId: string }) => {
    if (!d?.jwt) throw new Error("JWT token is required");
    if (!d?.userId?.trim()) throw new Error("User ID is required");
    return d;
  })
  .handler(async ({ data }) => {
    const caller = await verifySuperAdminCaller(data.jwt);

    // HARD LOCK: User 'chari' CANNOT be deleted under any circumstances
    if (data.userId === "chari") {
      throw new Error("Super-admin account 'chari' is protected and cannot be deleted.");
    }

    const { users } = getAdminServerSdk();
    const target = await users.get(data.userId);

    if (target.labels?.includes("superadmin")) {
      throw new Error("Super-admin accounts are protected and cannot be deleted.");
    }

    await recordServerAdminHistory(
      caller,
      "admin.delete",
      "admin",
      data.userId,
      `Revoked access and deleted administrator account for "${target.name || data.userId}" (${target.email})`,
      { userId: data.userId, name: target.name, email: target.email }
    );

    await users.delete(data.userId);
    return { success: true };
  });
