import "server-only";

/**
 * Email-capture provider abstraction. Double opt-in is delegated to the
 * provider (enable it on the Buttondown newsletter / Resend audience), so a
 * subscribe call registers a *pending* contact and the provider sends the
 * confirmation email. Selected by EMAIL_PROVIDER; a no-op in dev when unset.
 */

export type Profile = "diaspora" | "resident" | "professional";

export interface SubscribeInput {
  email: string;
  locale: string;
  profile?: Profile;
}

export interface SubscribeResult {
  ok: boolean;
  pending: boolean; // true → confirmation email sent (double opt-in)
  error?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function subscribe(input: SubscribeInput): Promise<SubscribeResult> {
  const email = input.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, pending: false, error: "invalid_email" };

  const provider = (process.env.EMAIL_PROVIDER ?? "none").toLowerCase();
  try {
    if (provider === "buttondown") return await buttondown(email, input);
    if (provider === "resend") return await resend(email, input);
    // Dev / unconfigured: accept without persisting so the UX is testable.
    console.info(`[email] no provider configured — would subscribe ${email} (${input.locale}/${input.profile ?? "—"})`);
    return { ok: true, pending: false };
  } catch (err) {
    console.error("[email] subscribe failed", err);
    return { ok: false, pending: false, error: "provider_error" };
  }
}

async function buttondown(email: string, input: SubscribeInput): Promise<SubscribeResult> {
  const key = process.env.BUTTONDOWN_API_KEY;
  if (!key) return { ok: false, pending: false, error: "not_configured" };
  const res = await fetch("https://api.buttondown.email/v1/subscribers", {
    method: "POST",
    headers: { Authorization: `Token ${key}`, "Content-Type": "application/json" },
    // type "unactivated" triggers Buttondown's double opt-in confirmation email.
    body: JSON.stringify({
      email_address: email,
      type: "unactivated",
      metadata: { locale: input.locale, profile: input.profile ?? "" },
      tags: [input.locale, input.profile ?? "unknown"],
    }),
  });
  if (res.status === 201 || res.status === 200) return { ok: true, pending: true };
  if (res.status === 409) return { ok: true, pending: false }; // already subscribed
  return { ok: false, pending: false, error: `buttondown_${res.status}` };
}

async function resend(email: string, input: SubscribeInput): Promise<SubscribeResult> {
  const key = process.env.RESEND_API_KEY;
  const audience = process.env.RESEND_AUDIENCE_ID;
  if (!key || !audience) return { ok: false, pending: false, error: "not_configured" };
  const res = await fetch(`https://api.resend.com/audiences/${audience}/contacts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email, unsubscribed: false }),
  });
  // Resend contacts don't carry custom metadata; locale/profile are logged for
  // now (a follow-up can persist them to the pipeline's newsletter_signups).
  console.info(`[email] resend contact ${email} locale=${input.locale} profile=${input.profile ?? "—"}`);
  if (res.ok) return { ok: true, pending: true };
  return { ok: false, pending: false, error: `resend_${res.status}` };
}
