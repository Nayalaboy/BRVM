"use server";

import {redirect} from "@/i18n/navigation";
import {signIn} from "@/lib/auth";
import {cookies} from "next/headers";

const pipelineApi = process.env.PIPELINE_API_URL ?? "http://localhost:8000";

export async function requestMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const locale = formData.get("locale") === "en" ? "en" : "fr";
  const response = await fetch(`${pipelineApi}/auth/magic/request`, {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify({email, locale}),
    cache: "no-store",
  });
  redirect({
    href: response.ok
      ? {pathname: "/connexion", query: {sent: "1"}}
      : {pathname: "/connexion", query: {error: "email"}},
    locale,
  });
}

export async function signInWithGoogle(formData: FormData) {
  const locale = formData.get("locale") === "en" ? "en" : "fr";
  (await cookies()).set("aqlee-auth-locale", locale, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  await signIn("google", {redirectTo: locale === "en" ? "/en/compte" : "/compte"});
}
