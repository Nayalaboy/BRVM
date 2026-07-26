"use client";

import {signIn} from "next-auth/react";
import {useTranslations} from "next-intl";
import {useEffect, useState} from "react";
import {useRouter} from "@/i18n/navigation";

export function MagicLinkVerifier({
  email,
  token,
  locale,
}: {
  email: string;
  token: string;
  locale: "fr" | "en";
}) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!email || !token) {
      setFailed(true);
      return;
    }
    void signIn("magic-link", {email, token, locale, redirect: false}).then((result) => {
      if (result?.error) setFailed(true);
      else router.replace("/compte");
    });
  }, [email, locale, router, token]);

  return (
    <div className="mx-auto max-w-lg border border-zinc-300 bg-white p-6 text-center">
      <h1 className="text-xl font-black">{failed ? t("invalid") : t("verifying")}</h1>
    </div>
  );
}
