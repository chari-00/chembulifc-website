import { createServerFn } from "@tanstack/react-start";

export const listRegistrationsFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const { listRegistrationsServerHandler } = await import("./registrations.server");
    return listRegistrationsServerHandler();
  });

export const deleteRegistrationFn = createServerFn({ method: "POST" })
  .validator((d: { registrationId: string }) => {
    if (!d?.registrationId) throw new Error("registrationId is required");
    return d;
  })
  .handler(async ({ data }) => {
    const { deleteRegistrationServerHandler } = await import("./registrations.server");
    return deleteRegistrationServerHandler(data.registrationId);
  });
