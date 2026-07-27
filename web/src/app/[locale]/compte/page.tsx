import {getTranslations} from "next-intl/server";
import {Link} from "@/i18n/navigation";
import {auth, signOut} from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await auth();
  const t = await getTranslations("auth");
  if (!session?.user) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-3xl font-black">{t("accountTitle")}</h1>
        <p>{t("signedOut")}</p>
        <Link className="inline-block bg-brand-500 px-4 py-2 font-black text-black hover:bg-brand-400" href="/connexion">
          {t("signIn")}
        </Link>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="text-3xl font-black">{t("accountTitle")}</h1>
      <div className="border border-zinc-300 bg-white p-5">
        <p className="font-bold">{session.user.name ?? session.user.email}</p>
        <p className="text-sm text-zinc-600">{session.user.email}</p>
      </div>
      <p className="text-sm text-zinc-600">{t("accountBody")}</p>
      <form
        action={async () => {
          "use server";
          await signOut({redirectTo: "/"});
        }}
      >
        <button className="border border-zinc-400 px-4 py-2 font-bold" type="submit">
          {t("signOut")}
        </button>
      </form>
    </div>
  );
}
