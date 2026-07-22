import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata() {
  const t = await getTranslations("legal");
  return { title: t("termsTitle") };
}

export default async function TermsPage({
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
      <h1>{t("termsTitle")}</h1>
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        {t("placeholder")}
      </p>
      {fr ? (
        <>
          <h2>1. Objet du service</h2>
          <p>
            BRVM Research fournit des informations financières, des données de
            marché et des outils d&apos;analyse relatifs aux sociétés cotées à la
            Bourse Régionale des Valeurs Mobilières (BRVM), à des fins
            d&apos;information et d&apos;éducation uniquement.
          </p>
          <h2>2. Absence de conseil en investissement</h2>
          <p>
            Le service ne fournit aucun conseil en investissement personnalisé.
            Les contenus, y compris ceux générés par intelligence artificielle,
            ne constituent ni une recommandation d&apos;achat ou de vente, ni une
            sollicitation. BRVM Research n&apos;est pas une société de gestion et
            d&apos;intermédiation (SGI) agréée.
          </p>
          <h2>3. Abonnements et paiement</h2>
          <p>
            Les abonnements Premium sont facturés mensuellement via Stripe et
            résiliables à tout moment depuis l&apos;espace compte. En cas d&apos;échec de
            paiement, l&apos;accès Premium est maintenu pendant une période de grâce
            avant suspension.
          </p>
          <h2>4. Exactitude des données</h2>
          <p>
            Les données proviennent de sources officielles (bulletins de la
            BRVM, publications des émetteurs) mais peuvent comporter des erreurs
            ou des retards. Elles sont fournies « en l&apos;état », sans garantie.
          </p>
          <h2>5. Contenu généré par IA</h2>
          <p>
            Certains contenus sont générés automatiquement puis relus. Ils sont
            systématiquement signalés comme tels et ne doivent pas être utilisés
            comme unique base de décision.
          </p>
        </>
      ) : (
        <>
          <h2>1. Purpose of the service</h2>
          <p>
            BRVM Research provides financial information, market data and
            analysis tools covering companies listed on the Bourse Régionale
            des Valeurs Mobilières (BRVM), for information and educational
            purposes only.
          </p>
          <h2>2. No investment advice</h2>
          <p>
            The service does not provide personalized investment advice.
            Content, including AI-generated content, is neither a
            recommendation to buy or sell nor a solicitation. BRVM Research is
            not a licensed brokerage firm (SGI).
          </p>
          <h2>3. Subscriptions and payment</h2>
          <p>
            Premium subscriptions are billed monthly via Stripe and can be
            cancelled at any time from the account area. If a payment fails,
            Premium access is kept during a grace period before suspension.
          </p>
          <h2>4. Data accuracy</h2>
          <p>
            Data comes from official sources (BRVM bulletins, issuer
            publications) but may contain errors or delays. It is provided
            &quot;as is&quot;, without warranty.
          </p>
          <h2>5. AI-generated content</h2>
          <p>
            Some content is generated automatically and then reviewed. It is
            always flagged as such and must not be used as the sole basis for
            a decision.
          </p>
        </>
      )}
    </article>
  );
}
