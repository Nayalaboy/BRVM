import { subscribe, type Profile } from "@/lib/email";

export const runtime = "nodejs";

const PROFILES: Profile[] = ["diaspora", "resident", "professional"];

export async function POST(request: Request): Promise<Response> {
  let body: { email?: string; locale?: string; profile?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const email = (body.email ?? "").trim();
  const locale = body.locale === "en" ? "en" : "fr";
  const profile = PROFILES.includes(body.profile as Profile)
    ? (body.profile as Profile)
    : undefined;

  const result = await subscribe({ email, locale, profile });
  if (!result.ok) {
    const status = result.error === "invalid_email" ? 422 : 502;
    return Response.json({ ok: false, error: result.error }, { status });
  }
  return Response.json({ ok: true, pending: result.pending });
}
