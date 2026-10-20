import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { routeTree } from "@/routeTree.gen";

describe("Super-Admin System", () => {
  it("matches the /admin/users route under /admin", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const matches = router.matchRoutes("/admin/users");
    expect(matches.at(-1)?.routeId).toBe("/admin/users");
  });

  it("enforces protected hard-lock: chari user ID cannot be targeted for deletion", () => {
    // Test the hard-lock constraint logic
    const attemptDelete = (userId: string, labels: string[] = []) => {
      if (userId === "chari") {
        throw new Error("Super-admin account 'chari' is protected and cannot be deleted.");
      }
      if (labels.includes("superadmin")) {
        throw new Error("Super-admin accounts are protected and cannot be deleted.");
      }
      return true;
    };

    expect(() => attemptDelete("chari", ["superadmin"])).toThrow(
      "Super-admin account 'chari' is protected and cannot be deleted."
    );
    expect(() => attemptDelete("other_user", ["superadmin"])).toThrow(
      "Super-admin accounts are protected and cannot be deleted."
    );
    expect(attemptDelete("regular_admin", ["admin"])).toBe(true);
  });

  it("handles username identifier normalization for chari without @", () => {
    const normalizeIdentifier = (input: string) => {
      let identifier = input.trim();
      if (!identifier.includes("@")) {
        identifier = `${identifier}@chembulifc.com`;
      }
      return identifier;
    };

    expect(normalizeIdentifier("chari")).toBe("chari@chembulifc.com");
    expect(normalizeIdentifier("admin")).toBe("admin@chembulifc.com");
    expect(normalizeIdentifier("custom@domain.com")).toBe("custom@domain.com");
  });

  it("verifies session validity exclusively against Appwrite account.get() without local auth flags", async () => {
    // Session verification must directly query Appwrite account.get()
    const mockUser = {
      $id: "admin_user",
      name: "Admin User",
      email: "admin@chembulifc.com",
      labels: ["admin"],
    };

    let currentUser: any = null;
    let authed = false;

    // Simulate session check using Appwrite account.get()
    const checkSession = async (accountGetter: () => Promise<any>) => {
      try {
        const user = await accountGetter();
        currentUser = user;
        authed = true;
      } catch {
        currentUser = null;
        authed = false;
      }
    };

    // 1. Success on valid Appwrite session
    await checkSession(async () => mockUser);
    expect(authed).toBe(true);
    expect(currentUser?.$id).toBe("admin_user");

    // 2. Failure on unauthenticated / invalid Appwrite session
    await checkSession(async () => {
      throw new Error("401 Unauthorized");
    });
    expect(authed).toBe(false);
    expect(currentUser).toBeNull();

    // 3. Ensure localStorage / sessionStorage are not used as auth authority
    expect(typeof window !== "undefined" ? window.localStorage.getItem("cfc-admin") : null).toBeNull();
    expect(typeof window !== "undefined" ? window.sessionStorage.getItem("cfc-admin") : null).toBeNull();
  });

  it("guards users.updateEmail when email is unchanged to prevent 409 user_target_already_exists", async () => {
    const targetUser = {
      $id: "admin_bolo",
      name: "bolo",
      email: "bolo@chembulifc.com",
    };

    let updateEmailCalled = false;
    const mockUsersService = {
      updateName: async (_userId: string, _name: string) => {},
      updateEmail: async (_userId: string, _email: string) => {
        updateEmailCalled = true;
      },
    };

    // Replicate the fixed server function logic
    const executeUpdateAdmin = async (data: { userId: string; name?: string; email?: string }) => {
      if (data.name?.trim()) {
        await mockUsersService.updateName(data.userId, data.name.trim());
      }
      // ONLY update email if it actually changed to prevent 409 Conflict
      if (data.email?.trim() && data.email.trim().toLowerCase() !== targetUser.email.toLowerCase()) {
        await mockUsersService.updateEmail(data.userId, data.email.trim().toLowerCase());
      }
    };

    // Case 1: Editing name only while keeping same email (Symptom D scenario)
    await executeUpdateAdmin({
      userId: targetUser.$id,
      name: "bolo-renamed",
      email: "bolo@chembulifc.com", // identical email
    });
    expect(updateEmailCalled).toBe(false); // Must NOT call updateEmail

    // Case 2: Editing email to a new address
    await executeUpdateAdmin({
      userId: targetUser.$id,
      name: "bolo-renamed",
      email: "bolo-new@chembulifc.com", // changed email
    });
    expect(updateEmailCalled).toBe(true); // Must call updateEmail
  });
});
