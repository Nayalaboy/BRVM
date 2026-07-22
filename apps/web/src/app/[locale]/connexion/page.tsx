import { getLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import {
  auth,
  isDevLoginEnabled,
  isEmailEnabled,
  isGoogleEnabled,
  signIn,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("signIn");
  return { title: t("title") };
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const t = await getTranslations("signIn");
  const locale = await getLocale();
  const session = await auth();
  const { sent } = await searchParams;

  if (session?.user) {
    redirect({ href: "/compte", locale: locale as "fr" | "en" });
  }

  return (
    <div className="mx-auto max-w-md space-y-8 py-8">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {t("title")}
        </h1>
        <p className="text-slate-600">{t("subtitle")}</p>
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        {isGoogleEnabled ? (
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/compte" });
            }}
          >
            <button
              type="submit"
              className="w-full rounded-full border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t("google")}
            </button>
          </form>
        ) : null}

        {isEmailEnabled ? (
          <>
            {sent ? (
              <p className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-800">
                {t("emailSent")}
              </p>
            ) : null}
            <form
              action={async (formData) => {
                "use server";
                await signIn("resend", {
                  email: formData.get("email"),
                  redirect: false,
                });
                redirect({
                  href: { pathname: "/connexion", query: { sent: "1" } },
                  locale: locale as "fr" | "en",
                });
              }}
              className="space-y-3"
            >
              <label className="block text-sm font-medium text-slate-700">
                {t("emailLabel")}
                <input
                  type="email"
                  name="email"
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                  placeholder="vous@exemple.com"
                />
              </label>
              <button
                type="submit"
                className="w-full rounded-full bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
              >
                {t("emailButton")}
              </button>
            </form>
          </>
        ) : null}

        {isDevLoginEnabled ? (
          <form
            action={async (formData) => {
              "use server";
              await signIn("dev-login", {
                email: formData.get("email"),
                locale,
                redirectTo: "/compte",
              });
            }}
            className="space-y-3 rounded-lg border border-dashed border-amber-300 bg-amber-50/50 p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              {t("devLabel")}
            </p>
            <input
              type="email"
              name="email"
              required
              defaultValue="dev@example.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
            <button
              type="submit"
              className="w-full rounded-full bg-amber-600 py-2 text-sm font-semibold text-white hover:bg-amber-700"
            >
              {t("devButton")}
            </button>
          </form>
        ) : null}

        <p className="pt-2 text-center text-xs leading-relaxed text-slate-400">
          {t.rich("legal", {
            terms: (chunks) => (
              <Link href="/conditions" className="underline">
                {chunks}
              </Link>
            ),
            privacy: (chunks) => (
              <Link href="/confidentialite" className="underline">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </div>
    </div>
  );
}
