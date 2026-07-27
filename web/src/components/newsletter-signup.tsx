"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

type State = "idle" | "loading" | "ok" | "pending" | "error";

export function NewsletterSignup() {
  const t = useTranslations("newsletter");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState("");
  const [state, setState] = useState<State>("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale, profile: profile || undefined }),
      });
      const data = await res.json();
      setState(res.ok ? (data.pending ? "pending" : "ok") : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "ok" || state === "pending") {
    return (
      <p className="border-l-4 border-emerald-500 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
        {state === "pending" ? t("pending") : t("success")}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("emailPlaceholder")}
          aria-label={t("emailPlaceholder")}
          className="min-w-0 flex-1 border border-zinc-400 bg-zinc-50 px-4 py-2.5 text-sm text-black focus:border-brand-500 focus:outline-none"
        />
        <select
          value={profile}
          onChange={(e) => setProfile(e.target.value)}
          aria-label={t("profileLabel")}
          className="border border-zinc-400 bg-white px-4 py-2.5 text-sm text-zinc-700 focus:border-brand-500 focus:outline-none"
        >
          <option value="">{t("profileLabel")}</option>
          <option value="resident">{t("profileResident")}</option>
          <option value="diaspora">{t("profileDiaspora")}</option>
          <option value="professional">{t("profileProfessional")}</option>
        </select>
        <button
          type="submit"
          disabled={state === "loading"}
          className="bg-black px-6 py-2.5 text-xs font-black uppercase text-white transition hover:bg-brand-500 hover:text-black disabled:opacity-60"
        >
          {state === "loading" ? t("submitting") : t("submit")}
        </button>
      </div>
      {state === "error" ? <p className="text-sm text-red-600">{t("error")}</p> : null}
      <p className="text-xs text-slate-400">{t("consent")}</p>
    </form>
  );
}
