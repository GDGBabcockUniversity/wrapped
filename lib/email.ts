import { Resend } from "resend";
import { copy } from "@/lib/copy";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wrapped.gdgbabcock.com";

function magicLinkEmailHtml(link: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#0f0f0f;font-family:system-ui,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:32px 0;">
      <tr>
        <td align="center">
          <table width="420" cellpadding="0" cellspacing="0" style="background:#0f0f0f;">
            <tr>
              <td style="padding:0 24px 24px;">
                <p style="color:#fff6e0;font-size:24px;font-weight:700;margin:0 0 16px;">
                  ${copy.email.heading}
                </p>
                <p style="color:rgba(255,246,224,0.75);font-size:15px;line-height:1.5;margin:0 0 24px;">
                  ${copy.email.body}
                </p>
                <a href="${link}"
                   style="display:inline-block;background:#fff6e0;color:#0f0f0f;font-weight:700;
                          font-size:13px;letter-spacing:0.08em;text-transform:uppercase;
                          text-decoration:none;padding:14px 28px;border-radius:9999px;">
                  ${copy.email.button}
                </a>
                <p style="color:rgba(255,246,224,0.45);font-size:12px;line-height:1.5;margin:24px 0 0;">
                  ${copy.email.expiry}
                </p>
                <p style="color:rgba(255,246,224,0.35);font-size:12px;line-height:1.5;margin:8px 0 0;">
                  ${copy.email.ignore}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function magicLinkEmailText(link: string): string {
  return `${copy.email.heading}\n\n${copy.email.body}\n\n${link}\n\n${copy.email.expiry}\n${copy.email.ignore}`;
}

/**
 * Sends the magic-link email. In development (or whenever RESEND_API_KEY is
 * unset), logs the link to the console instead of sending — this is the
 * dev-fallback flow so the whole auth loop is testable without a Resend key.
 */
export async function sendMagicLinkEmail(email: string, token: string): Promise<void> {
  const link = `${SITE_URL}/api/auth/verify?token=${encodeURIComponent(token)}`;

  if (!process.env.RESEND_API_KEY) {
    console.log(`[wrapped] dev magic link for ${email}: ${link}`);
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const send = resend.emails.send({
    from: process.env.EMAIL_FROM ?? "GDG Wrapped <wrapped@gdgbabcock.com>",
    to: email,
    subject: copy.email.subject,
    html: magicLinkEmailHtml(link),
    text: magicLinkEmailText(link),
  }).then((result) => {
    // Resend's SDK resolves (doesn't reject) on API-level failures — the
    // error lands in `result.error`, not a thrown exception. Log it or a
    // misconfigured sender/unverified domain fails 100% of the time with
    // zero visible signal anywhere (§11.1 ops — same principle as the
    // request route's named config-error surfacing).
    if (result.error) {
      console.error("[wrapped] Resend send failed:", result.error);
    }
    return result;
  });

  // Cap at 3s — the email usually lands regardless; the UI already says
  // "check your inbox" so a slow provider response shouldn't block the route.
  await Promise.race([
    send,
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]).catch((err) => {
    console.error("[wrapped] Resend send threw:", err);
  });
}
