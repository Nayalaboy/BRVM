/**
 * Lexicon entries — short, accurate FR/EN definitions of BRVM/WAEMU investing
 * terms. Each answers a question actually asked in BRVM communities and is
 * rendered as an anchored, SEO-friendly section on /lexique.
 */

export interface LexiconEntry {
  slug: string;
  term: { fr: string; en: string };
  question: { fr: string; en: string };
  body: { fr: string; en: string };
}

export const LEXICON: LexiconEntry[] = [
  {
    slug: "fcp",
    term: { fr: "FCP", en: "FCP (mutual fund)" },
    question: { fr: "C'est quoi un FCP ?", en: "What is an FCP?" },
    body: {
      fr: "Un Fonds Commun de Placement (FCP) est un portefeuille de valeurs mobilières (actions, obligations) détenu collectivement par des investisseurs. En achetant des parts, vous mutualisez le risque et déléguez la gestion à une société agréée. C'est une forme d'OPCVM sans personnalité juridique (contrairement à la SICAV).",
      en: "A Fonds Commun de Placement (FCP) is a portfolio of securities (equities, bonds) held collectively by investors. Buying units pools risk and delegates management to a licensed company. It is a type of OPCVM without a legal personality (unlike a SICAV).",
    },
  },
  {
    slug: "opcvm",
    term: { fr: "OPCVM", en: "OPCVM (collective fund)" },
    question: { fr: "OPCVM : définition", en: "OPCVM: definition" },
    body: {
      fr: "Organisme de Placement Collectif en Valeurs Mobilières : structure qui collecte l'épargne de plusieurs investisseurs pour l'investir selon une politique définie. Les FCP et les SICAV sont des OPCVM, agréés et contrôlés par le régulateur (le CREPMF dans l'UEMOA).",
      en: "A collective investment scheme that pools savings from many investors and invests them under a defined policy. FCPs and SICAVs are OPCVMs, licensed and supervised by the regulator (CREPMF in WAEMU).",
    },
  },
  {
    slug: "compte-titres",
    term: { fr: "Compte-titres", en: "Securities account" },
    question: { fr: "Comment ouvrir un compte SGI ?", en: "How do I open an SGI account?" },
    body: {
      fr: "Un compte-titres, ouvert auprès d'une SGI (Société de Gestion et d'Intermédiation), enregistre vos actions et obligations et permet de passer des ordres en bourse. Il est distinct de votre compte bancaire : la SGI est le seul intermédiaire agréé pour acheter et vendre à la BRVM. Pour l'ouvrir, contactez une SGI agréée avec une pièce d'identité et un justificatif.",
      en: "A securities account, opened with an SGI (licensed brokerage), records your shares and bonds and lets you place market orders. It is separate from your bank account: the SGI is the only licensed intermediary to trade on the BRVM. To open one, contact a licensed SGI with ID and proof of address.",
    },
  },
  {
    slug: "gestion-mandat-vs-auto",
    term: { fr: "Gestion sous mandat vs auto-gestion", en: "Managed vs self-directed" },
    question: {
      fr: "Gestion sous mandat ou auto-gestion ?",
      en: "Managed account or self-directed?",
    },
    body: {
      fr: "En auto-gestion, vous décidez vous-même de vos achats/ventes et passez vos ordres via votre SGI. En gestion sous mandat, vous confiez votre portefeuille à un professionnel (SGI ou SGP) qui décide à votre place, selon un mandat et un profil de risque convenus, moyennant des frais de gestion.",
      en: "Self-directed: you make your own buy/sell decisions and place orders through your SGI. Managed (sous mandat): you entrust your portfolio to a professional (SGI or SGP) who decides on your behalf, under an agreed mandate and risk profile, for a management fee.",
    },
  },
  {
    slug: "ordre-cours-limite",
    term: { fr: "Ordre à cours limité", en: "Limit order" },
    question: { fr: "Ordre à cours limité : comment ça marche ?", en: "How does a limit order work?" },
    body: {
      fr: "Un ordre à cours limité fixe un prix maximum à l'achat (ou minimum à la vente). Il n'est exécuté que si le marché atteint ce prix ou mieux. Il protège du risque de payer trop cher, mais peut ne pas être exécuté — contrairement à l'ordre « au marché », exécuté au meilleur prix disponible.",
      en: "A limit order sets a maximum buy price (or minimum sell price). It only executes if the market reaches that price or better. It protects against overpaying but may go unfilled — unlike a market order, which executes at the best available price.",
    },
  },
  {
    slug: "capitalisation-vs-prix",
    term: { fr: "Capitalisation vs prix de l'action", en: "Market cap vs share price" },
    question: {
      fr: "Une action « pas chère », est-ce une bonne affaire ?",
      en: "Is a low share price a bargain?",
    },
    body: {
      fr: "Le prix d'une action seul ne dit pas si une société est « chère ». La capitalisation boursière = prix × nombre d'actions ; c'est la valeur totale de la société en bourse. Exemple : ETI (Ecobank Transnational) cote quelques dizaines de FCFA, mais avec des milliards d'actions sa capitalisation dépasse celle de sociétés au cours unitaire bien plus élevé. Comparez les capitalisations, pas les prix unitaires.",
      en: "A share price alone doesn't tell you whether a company is 'expensive'. Market cap = price × number of shares; that's the company's total market value. Example: ETI (Ecobank Transnational) trades at a few dozen FCFA, but with billions of shares its market cap exceeds that of companies with a far higher unit price. Compare market caps, not unit prices.",
    },
  },
  {
    slug: "dividendes-fiscalite",
    term: { fr: "Dividendes et fiscalité (IRVM)", en: "Dividends and tax (IRVM)" },
    question: {
      fr: "Dividende brut ou net : que vais-je toucher ?",
      en: "Gross or net dividend: what do I receive?",
    },
    body: {
      fr: "Le dividende brut est le montant voté en assemblée ; le dividende net est ce que vous recevez après l'IRVM (Impôt sur le Revenu des Valeurs Mobilières), généralement retenu à la source. Le taux et le traitement peuvent varier selon votre pays de résidence dans l'UEMOA et les conventions fiscales (résidents et diaspora). Renseignez-vous auprès de votre SGI ou d'un conseil fiscal.",
      en: "The gross dividend is the amount approved at the AGM; the net dividend is what you receive after IRVM (securities income tax), usually withheld at source. Rates and treatment can vary by your country of residence within WAEMU and by tax treaties (residents and diaspora). Check with your SGI or a tax adviser.",
    },
  },
  {
    slug: "sgi",
    term: { fr: "SGI", en: "SGI (brokerage)" },
    question: { fr: "C'est quoi une SGI ?", en: "What is an SGI?" },
    body: {
      fr: "Une Société de Gestion et d'Intermédiation (SGI) est l'intermédiaire agréé par le CREPMF pour ouvrir des comptes-titres, passer vos ordres et vous conseiller sur la BRVM. Seules les SGI agréées peuvent intervenir sur le marché — vérifiez toujours l'agrément d'une société avant de lui confier votre argent.",
      en: "A Société de Gestion et d'Intermédiation (SGI) is the CREPMF-licensed intermediary that opens securities accounts, places your orders and advises you on the BRVM. Only licensed SGIs may operate on the market — always verify a firm's licence before entrusting it with your money.",
    },
  },
];
