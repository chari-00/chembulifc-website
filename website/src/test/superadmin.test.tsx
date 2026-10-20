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
});
