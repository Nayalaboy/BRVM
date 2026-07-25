import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("legal");
  return { title: t("privacyTitle") };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("legal");
  const fr = locale === "fr";

  return (
    <article className="prose prose-slate mx-auto max-w-3xl py-4">
      <h1>{t("privacyTitle")}</h1>
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        {t("placeholder")}
      </p>
      {fr ? (
        <>
          <h2>1. Données collectées</h2>
          <p>
            Nous collectons votre adresse e-mail, votre nom (si fourni par
            votre fournisseur d&apos;identité), votre langue préférée, ainsi que des
            événements d&apos;usage du produit (inscription, questions posées au
            copilote, filtres sauvegardés) nécessaires au fonctionnement et à
            l&apos;amélioration du service.
          </p>
          <h2>2. Paiement</h2>
          <p>
            Les paiements sont traités par Stripe. Nous ne stockons aucune
            donnée de carte bancaire ; nous conservons uniquement l&apos;identifiant
            client Stripe et l&apos;état de votre abonnement.
          </p>
          <h2>3. Sous-traitants</h2>
          <p>
            Hébergement (Vercel), base de données managée, Stripe (paiement),
            Anthropic (traitement des questions posées au copilote). Les
            questions envoyées au copilote sont transmises à l&apos;API Anthropic
            pour générer la réponse.
          </p>
          <h2>4. Vos droits</h2>
          <p>
            Vous pouvez demander l&apos;accès, la rectification ou la suppression de
            vos données en nous contactant. La suppression du compte entraîne
            la suppression des données associées.
          </p>
        </>
      ) : (
        <>
          <h2>1. Data we collect</h2>
          <p>
            We collect your email address, your name (if provided by your
            identity provider), your preferred language, and product usage
            events (signup, copilot questions, saved screens) required to
            operate and improve the service.
          </p>
          <h2>2. Payments</h2>
          <p>
            Payments are processed by Stripe. We never store card data; we only
            keep the Stripe customer identifier and your subscription state.
          </p>
          <h2>3. Processors</h2>
          <p>
            Hosting (Vercel), managed database, Stripe (payments), Anthropic
            (processing of copilot questions). Questions sent to the copilot
            are forwarded to the Anthropic API to generate the answer.
          </p>
          <h2>4. Your rights</h2>
          <p>
            You may request access, rectification or deletion of your data by
            contacting us. Deleting your account deletes the associated data.
          </p>
        </>
      )}
    </article>
  );
}
