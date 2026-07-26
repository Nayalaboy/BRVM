import {MagicLinkVerifier} from "@/components/magic-link-verifier";

export const dynamic = "force-dynamic";

export default async function VerificationPage({
  params,
  searchParams,
}: {
  params: Promise<{locale: string}>;
  searchParams: Promise<{email?: string; token?: string}>;
}) {
  const {locale} = await params;
  const {email = "", token = ""} = await searchParams;
  return <MagicLinkVerifier email={email} token={token} locale={locale === "en" ? "en" : "fr"} />;
}
