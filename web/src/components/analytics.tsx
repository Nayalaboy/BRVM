import Script from "next/script";

/**
 * Privacy-friendly analytics, env-gated. Set NEXT_PUBLIC_PLAUSIBLE_DOMAIN to
 * enable Plausible (self-host via NEXT_PUBLIC_PLAUSIBLE_SRC). No cookies, no
 * personal data — renders nothing when unset.
 */
export function Analytics() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  if (!domain) return null;
  const src = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC ?? "https://plausible.io/js/script.js";
  return <Script defer data-domain={domain} src={src} strategy="afterInteractive" />;
}
