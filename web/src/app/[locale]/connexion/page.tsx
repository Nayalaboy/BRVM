import {getTranslations} from "next-intl/server";
import {isGoogleAuthEnabled} from "@/lib/auth";
import {requestMagicLink, signInWithGoogle} from "./actions";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{locale: string}>;
  searchParams: Promise<{sent?: string; error?: string}>;
}) {
  const {locale} = await params;
  const state = await searchParams;
  const t = await getTranslations("auth");

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-brand-700">
          {t("eyebrow")}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-sm text-zinc-600">{t("body")}</p>
      </div>
      {state.sent ? (
        <p className="border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
          {t("sent")}
        </p>
      ) : null}
      {state.error ? (
        <p className="border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          {t("error")}
        </p>
      ) : null}
      <form action={requestMagicLink} className="space-y-3 border border-zinc-300 bg-white p-5">
        <input type="hidden" name="locale" value={locale} />
        <label className="block text-xs font-bold uppercase tracking-wide" htmlFor="email">
          {t("email")}
        </label>
        <input
          className="w-full border border-zinc-400 px-3 py-2"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
        <button className="w-full bg-brand-600 px-4 py-2 font-black uppercase text-white hover:bg-brand-700" type="submit">
          {t("emailCta")}
        </button>
      </form>
      {isGoogleAuthEnabled ? (
        <form action={signInWithGoogle}>
          <input type="hidden" name="locale" value={locale} />
          <button className="w-full border border-zinc-400 bg-white px-4 py-2 font-bold" type="submit">
            {t("googleCta")}
          </button>
        </form>
      ) : null}
      <p className="text-xs text-zinc-500">{t("noGate")}</p>
    </div>
  );
}
