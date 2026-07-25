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
      <p className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-900">
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
          className="min-w-0 flex-1 rounded-full border border-slate-300 px-5 py-2.5 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <select
          value={profile}
          onChange={(e) => setProfile(e.target.value)}
          aria-label={t("profileLabel")}
          className="rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-brand-500 focus:outline-none"
        >
          <option value="">{t("profileLabel")}</option>
          <option value="resident">{t("profileResident")}</option>
          <option value="diaspora">{t("profileDiaspora")}</option>
          <option value="professional">{t("profileProfessional")}</option>
        </select>
        <button
          type="submit"
          disabled={state === "loading"}
          className="rounded-full bg-brand-800 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900 disabled:opacity-60"
        >
          {state === "loading" ? t("submitting") : t("submit")}
        </button>
      </div>
      {state === "error" ? <p className="text-sm text-red-600">{t("error")}</p> : null}
      <p className="text-xs text-slate-400">{t("consent")}</p>
    </form>
  );
}
