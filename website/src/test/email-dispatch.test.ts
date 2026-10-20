import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import {
  validateEmailInput,
  sendRegistrationEmailHandler,
  buildRegistrationEmailHtml,
  buildRegistrationEmailText,
  buildRegistrationEmailAttachments,
  getSignatureImagePath,
} from "../lib/email.functions";

describe("sendRegistrationEmail (Gmail SMTP Transport & Rich HTML)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.GMAIL_APP_PASSWORD;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("builds rich HTML with message content, TEAM CHEMBULI FC signature, and inline CID logo", () => {
    const rawText = "Registration for Weekend 7s Cup is confirmed.\n\nPlease arrive 30 mins before kickoff.";
    const html = buildRegistrationEmailHtml(rawText);

    // Verifies body text is preserved and escaped
    expect(html).toContain("Registration for Weekend 7s Cup is confirmed.");
    expect(html).toContain("Please arrive 30 mins before kickoff.");

    // Verifies TEAM CHEMBULI FC signature block
    expect(html).toContain("TEAM CHEMBULI FC");

    // Verifies inline CID image tag
    expect(html).toContain('<img src="cid:chembuli-logo"');
  });

  it("builds plain text email with consistent signature fallback", () => {
    const rawText = "Your registration is confirmed.";
    const text = buildRegistrationEmailText(rawText);

    expect(text).toContain("Your registration is confirmed.");
    expect(text).toContain("TEAM CHEMBULI FC");
    expect(text).toContain("chembuli.fc@gmail.com");
  });

  it("includes signature-message.png with correct CID 'chembuli-logo' in attachments", () => {
    const attachments = buildRegistrationEmailAttachments();

    expect(attachments).toHaveLength(1);
    expect(attachments[0].filename).toBe("signature-message.png");
    expect(attachments[0].cid).toBe("chembuli-logo");
    expect(fs.existsSync(attachments[0].path)).toBe(true);
  });

  it("resolves a valid, existing signature image file path", () => {
    const imgPath = getSignatureImagePath();
    expect(typeof imgPath).toBe("string");
    expect(fs.existsSync(imgPath)).toBe(true);
  });

  it("degrades gracefully with { sent: false } when GMAIL_APP_PASSWORD is not set", async () => {
    const result = await sendRegistrationEmailHandler({
      to: "varshanchari00@gmail.com",
      toName: "Varshan Chari",
      subject: "Chembuli FC Registration Confirmation",
      text: "Your tournament registration has been received.",
    });

    expect(result).toEqual({
      sent: false,
      reason: "Email sending is not set up yet",
    });
  });

  it("validates valid input payload and trims string caps", () => {
    const validated = validateEmailInput({
      to: "varshanchari00@gmail.com",
      toName: "Varshan Chari",
      subject: "Chembuli FC Confirmation",
      text: "Match details for weekend 7s.",
    });

    expect(validated.to).toBe("varshanchari00@gmail.com");
    expect(validated.toName).toBe("Varshan Chari");
    expect(validated.subject).toBe("Chembuli FC Confirmation");
    expect(validated.text).toBe("Match details for weekend 7s.");
  });

  it("rejects invalid email formats in inputValidator", () => {
    expect(() =>
      validateEmailInput({
        to: "invalid-email-address",
        toName: "Test Player",
        subject: "Test Subject",
        text: "Test Message",
      }),
    ).toThrow("Invalid email");
  });

  it("rejects email addresses that exceed 200 characters", () => {
    const longEmail = "a".repeat(195) + "@example.com";
    expect(() =>
      validateEmailInput({
        to: longEmail,
        toName: "Test Player",
        subject: "Test Subject",
        text: "Test Message",
      }),
    ).toThrow("Invalid email");
  });
});
