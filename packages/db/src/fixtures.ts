/**
 * Fixture data for local development and demos.
 *
 * Companies and tickers are real BRVM listings; dividend amounts and dates
 * are ILLUSTRATIVE approximations for development only — the production
 * pipeline replaces them with values extracted from official BOC bulletins.
 */

export interface CompanyFixture {
  symbol: string;
  name: string;
  sector: string;
  country: string;
  descriptionFr: string;
  descriptionEn: string;
  sharesOutstanding: number;
  /** Reference price in FCFA used to synthesize quote history. */
  refPrice: number;
  /** fiscalYear -> gross dividend per share (FCFA) */
  dividends: Record<number, number>;
}

export const COMPANIES: CompanyFixture[] = [
  {
    symbol: "SNTS",
    name: "Sonatel",
    sector: "Télécommunications",
    country: "Sénégal",
    descriptionFr:
      "Opérateur historique de télécommunications au Sénégal, présent au Mali, en Guinée, en Guinée-Bissau et en Sierra Leone. Filiale du groupe Orange.",
    descriptionEn:
      "Incumbent telecommunications operator in Senegal, also present in Mali, Guinea, Guinea-Bissau and Sierra Leone. Subsidiary of the Orange group.",
    sharesOutstanding: 100_000_000,
    refPrice: 22500,
    dividends: { 2021: 1120, 2022: 1358, 2023: 1450, 2024: 1546 },
  },
  {
    symbol: "ORAC",
    name: "Orange Côte d'Ivoire",
    sector: "Télécommunications",
    country: "Côte d'Ivoire",
    descriptionFr:
      "Premier opérateur mobile de Côte d'Ivoire, présent également au Burkina Faso et au Libéria.",
    descriptionEn:
      "Leading mobile operator in Côte d'Ivoire, also present in Burkina Faso and Liberia.",
    sharesOutstanding: 150_612_816,
    refPrice: 13000,
    dividends: { 2022: 400, 2023: 592, 2024: 660 },
  },
  {
    symbol: "ONTBF",
    name: "Onatel Burkina Faso",
    sector: "Télécommunications",
    country: "Burkina Faso",
    descriptionFr:
      "Opérateur national des télécommunications du Burkina Faso (marque Moov Africa).",
    descriptionEn:
      "National telecommunications operator of Burkina Faso (Moov Africa brand).",
    sharesOutstanding: 3_400_000,
    refPrice: 2600,
    dividends: { 2021: 355, 2022: 310, 2023: 262, 2024: 280 },
  },
  {
    symbol: "ETIT",
    name: "Ecobank Transnational Incorporated",
    sector: "Finance",
    country: "Togo",
    descriptionFr:
      "Groupe bancaire panafricain présent dans plus de 30 pays africains, coté à Lagos, Accra et sur la BRVM.",
    descriptionEn:
      "Pan-African banking group operating in more than 30 African countries, listed in Lagos, Accra and on the BRVM.",
    sharesOutstanding: 24_730_000_000,
    refPrice: 20,
    dividends: { 2023: 2.4, 2024: 3.1 },
  },
  {
    symbol: "SGBC",
    name: "Société Générale Côte d'Ivoire",
    sector: "Finance",
    country: "Côte d'Ivoire",
    descriptionFr:
      "Première banque de Côte d'Ivoire par le total de bilan, filiale du groupe Société Générale.",
    descriptionEn:
      "Largest bank in Côte d'Ivoire by total assets, subsidiary of the Société Générale group.",
    sharesOutstanding: 31_111_111,
    refPrice: 23000,
    dividends: { 2021: 1043, 2022: 1272, 2023: 1461, 2024: 1520 },
  },
  {
    symbol: "BOAB",
    name: "Bank of Africa Bénin",
    sector: "Finance",
    country: "Bénin",
    descriptionFr: "Filiale béninoise du groupe bancaire panafricain BOA (BMCE / Bank of Africa).",
    descriptionEn: "Beninese subsidiary of the pan-African BOA banking group (BMCE / Bank of Africa).",
    sharesOutstanding: 20_280_000,
    refPrice: 4700,
    dividends: { 2021: 386, 2022: 412, 2023: 449, 2024: 470 },
  },
  {
    symbol: "BOAC",
    name: "Bank of Africa Côte d'Ivoire",
    sector: "Finance",
    country: "Côte d'Ivoire",
    descriptionFr: "Filiale ivoirienne du groupe bancaire panafricain BOA.",
    descriptionEn: "Ivorian subsidiary of the pan-African BOA banking group.",
    sharesOutstanding: 60_000_000,
    refPrice: 5600,
    dividends: { 2021: 340, 2022: 372, 2023: 401, 2024: 428 },
  },
  {
    symbol: "NSBC",
    name: "NSIA Banque Côte d'Ivoire",
    sector: "Finance",
    country: "Côte d'Ivoire",
    descriptionFr: "Banque universelle ivoirienne, filiale du groupe de bancassurance NSIA.",
    descriptionEn: "Ivorian universal bank, subsidiary of the NSIA bancassurance group.",
    sharesOutstanding: 23_170_000,
    refPrice: 7000,
    dividends: { 2022: 289, 2023: 405, 2024: 450 },
  },
  {
    symbol: "CBIBF",
    name: "Coris Bank International",
    sector: "Finance",
    country: "Burkina Faso",
    descriptionFr: "Groupe bancaire burkinabè en forte croissance dans l'espace UEMOA.",
    descriptionEn: "Fast-growing Burkinabe banking group across the WAEMU region.",
    sharesOutstanding: 66_000_000,
    refPrice: 9500,
    dividends: { 2021: 550, 2022: 610, 2023: 690, 2024: 741 },
  },
  {
    symbol: "TTLC",
    name: "TotalEnergies Marketing Côte d'Ivoire",
    sector: "Distribution",
    country: "Côte d'Ivoire",
    descriptionFr: "Distribution de produits pétroliers et services associés en Côte d'Ivoire.",
    descriptionEn: "Distribution of petroleum products and related services in Côte d'Ivoire.",
    sharesOutstanding: 63_120_000,
    refPrice: 2400,
    dividends: { 2021: 176, 2022: 190, 2023: 208, 2024: 220 },
  },
  {
    symbol: "SHEC",
    name: "Vivo Energy Côte d'Ivoire",
    sector: "Distribution",
    country: "Côte d'Ivoire",
    descriptionFr: "Distribution de carburants et lubrifiants sous licence Shell.",
    descriptionEn: "Distribution of fuels and lubricants under the Shell brand licence.",
    sharesOutstanding: 63_000_000,
    refPrice: 900,
    dividends: { 2021: 64, 2022: 71, 2023: 78, 2024: 82 },
  },
  {
    symbol: "CIEC",
    name: "Compagnie Ivoirienne d'Électricité",
    sector: "Services publics",
    country: "Côte d'Ivoire",
    descriptionFr: "Concessionnaire du service public de l'électricité en Côte d'Ivoire (groupe Eranove).",
    descriptionEn: "Concession holder of the public electricity service in Côte d'Ivoire (Eranove group).",
    sharesOutstanding: 56_000_000,
    refPrice: 2500,
    dividends: { 2021: 165, 2022: 178, 2023: 190, 2024: 199 },
  },
  {
    symbol: "SDCC",
    name: "Sodeci",
    sector: "Services publics",
    country: "Côte d'Ivoire",
    descriptionFr: "Société de distribution d'eau de Côte d'Ivoire (groupe Eranove).",
    descriptionEn: "Water distribution company of Côte d'Ivoire (Eranove group).",
    sharesOutstanding: 22_400_000,
    refPrice: 4000,
    dividends: { 2021: 252, 2022: 265, 2023: 281, 2024: 288 },
  },
  {
    symbol: "PALC",
    name: "Palm Côte d'Ivoire",
    sector: "Agriculture",
    country: "Côte d'Ivoire",
    descriptionFr: "Production et transformation d'huile de palme (groupe Sifca).",
    descriptionEn: "Palm oil production and processing (Sifca group).",
    sharesOutstanding: 15_331_000,
    refPrice: 8000,
    dividends: { 2021: 820, 2022: 610, 2023: 402, 2024: 515 },
  },
  {
    symbol: "SOGC",
    name: "SOGB",
    sector: "Agriculture",
    country: "Côte d'Ivoire",
    descriptionFr: "Société des caoutchoucs de Grand-Béréby : hévéaculture et palmier à huile.",
    descriptionEn: "Grand-Béréby rubber company: rubber and oil palm plantations.",
    sharesOutstanding: 21_882_000,
    refPrice: 5000,
    dividends: { 2021: 460, 2022: 340, 2023: 290, 2024: 330 },
  },
  {
    symbol: "NTLC",
    name: "Nestlé Côte d'Ivoire",
    sector: "Industrie",
    country: "Côte d'Ivoire",
    descriptionFr: "Production agroalimentaire (Maggi, Nescafé) pour l'Afrique de l'Ouest.",
    descriptionEn: "Food production (Maggi, Nescafé) for West Africa.",
    sharesOutstanding: 8_800_000,
    refPrice: 6500,
    dividends: { 2022: 279, 2023: 380, 2024: 410 },
  },
  {
    symbol: "SLBC",
    name: "Solibra",
    sector: "Industrie",
    country: "Côte d'Ivoire",
    descriptionFr: "Société de limonaderies et brasseries d'Afrique (groupe Castel).",
    descriptionEn: "Soft drinks and breweries company of Africa (Castel group).",
    sharesOutstanding: 12_400_000,
    refPrice: 22000,
    dividends: { 2021: 1090, 2022: 1150, 2023: 1236, 2024: 1300 },
  },
];

/** Deterministic PRNG so seeded quotes are reproducible. */
export function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
