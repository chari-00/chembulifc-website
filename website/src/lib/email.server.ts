import nodemailer from "nodemailer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function getSignatureImagePath(): string {
  const candidatePaths: string[] = [];

  if (typeof import.meta.url === "string" && import.meta.url.startsWith("file:")) {
    try {
      candidatePaths.push(fileURLToPath(new URL("../assets/signature-message.png", import.meta.url)));
    } catch {}
  }

  candidatePaths.push(
    path.resolve(process.cwd(), "src/assets/signature-message.png"),
    path.resolve(process.cwd(), "website/src/assets/signature-message.png"),
    path.resolve(process.cwd(), "../logo/signature-message.png"),
    "C:\\Users\\hailq\\Music\\Chembuli\\logo\\signature-message.png",
    "C:\\Users\\hailq\\Music\\Chembuli\\website\\src\\assets\\signature-message.png",
  );

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) return p;
  }
  return "C:\\Users\\hailq\\Music\\Chembuli\\logo\\signature-message.png";
}

export function buildRegistrationEmailHtml(text: string): string {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin: 0 0 16px 0; line-height: 1.6;">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");

  return `<div style="background-color: #f4f6f9; padding: 30px 15px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    <div style="background-color: #16a34a; height: 4px; width: 100%;"></div>
    <div style="padding: 28px 28px 20px 28px; font-size: 15px; line-height: 1.6; color: #1f2937;">
      ${paragraphs || `<p style="margin: 0 0 16px 0; line-height: 1.6;">${escapeHtml(text).replace(/\n/g, "<br>")}</p>`}
    </div>
    <div style="padding: 0 28px 28px 28px;">
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 0 0 20px 0;" />
      <div style="font-size: 14px; font-weight: bold; color: #111827; letter-spacing: 0.5px; margin-bottom: 12px; text-transform: uppercase;">
        TEAM CHEMBULI FC
      </div>
      <div>
        <img src="cid:chembuli-logo" alt="TEAM CHEMBULI FC" width="544" style="max-width: 100%; height: auto; display: block; border-radius: 6px;" />
      </div>
    </div>
    <div style="background-color: #f9fafb; padding: 12px 28px; border-top: 1px solid #f3f4f6; font-size: 11px; color: #9ca3af; text-align: center;">
      This is an automated notification from Chembuli Football Club Tournament Management.
    </div>
  </div>
</div>`;
}

export function buildRegistrationEmailText(text: string): string {
  return `${text.trim()}

---
TEAM CHEMBULI FC
chembuli.fc@gmail.com
Instagram: @chembuli.fc
Contact: +91 72002 39411, +91 86104 74554`;
}

export function buildRegistrationEmailAttachments(): Array<{ filename: string; path: string; cid: string }> {
  return [
    {
      filename: "signature-message.png",
      path: getSignatureImagePath(),
      cid: "chembuli-logo",
    },
  ];
}

export function validateEmailInput(d: { to: string; toName: string; subject: string; text: string }) {
  if (!EMAIL_RE.test(d.to) || d.to.length > 200) throw new Error("Invalid email");
  return {
    to: d.to,
    toName: String(d.toName).slice(0, 100),
    subject: String(d.subject).slice(0, 200),
    text: String(d.text).slice(0, 5000),
  };
}

export async function sendRegistrationEmailHandler(data: {
  to: string;
  toName: string;
  subject: string;
  text: string;
}) {
  const GMAIL_APP_PASSWORD = process.env["GMAIL_APP_PASSWORD"];
  const SENDER_EMAIL = process.env["GMAIL_SENDER_EMAIL"] || "chembuli.fc@gmail.com";
  if (!GMAIL_APP_PASSWORD) {
    return { sent: false, reason: "Email sending is not set up yet" };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: SENDER_EMAIL,
        pass: GMAIL_APP_PASSWORD.replace(/\s+/g, ""),
      },
    });

    await transporter.sendMail({
      from: `"Chembuli FC" <${SENDER_EMAIL}>`,
      to: `"${data.toName}" <${data.to}>`,
      subject: data.subject,
      text: buildRegistrationEmailText(data.text),
      html: buildRegistrationEmailHtml(data.text),
      attachments: buildRegistrationEmailAttachments(),
    });

    return { sent: true };
  } catch (err: any) {
    console.error("Gmail SMTP send failed:", err?.message || err);
    return { sent: false, reason: err?.message || "Email dispatch failed" };
  }
}
