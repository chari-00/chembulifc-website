import { createServerFn } from "@tanstack/react-start";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function validateEmailInput(d: { to: string; toName: string; subject: string; text: string }) {
  if (!EMAIL_RE.test(d.to) || d.to.length > 200) throw new Error("Invalid email");
  return {
    to: d.to,
    toName: String(d.toName).slice(0, 100),
    subject: String(d.subject).slice(0, 200),
    text: String(d.text).slice(0, 5000),
  };
}

// Sends the team's registration confirmation via Gmail SMTP using Nodemailer.
// Node-only dependencies (nodemailer, fs, path) are dynamically imported inside
// the server-side handler so they are never bundled into client chunks.
export const sendRegistrationEmail = createServerFn({ method: "POST" })
  .validator(validateEmailInput)
  .handler(async ({ data }) => {
    const { sendRegistrationEmailHandler } = await import("./email.server");
    return sendRegistrationEmailHandler(data);
  });
