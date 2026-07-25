"""Seed dataset for the 47 BRVM-listed equities.

Real data captured from brvm.org (2026-07-22 close) — tickers, names, sectors,
shares outstanding and reference close — plus real NET dividends per share
(after IRVM) by exercice (2023–2025), sourced from RichBourse and the official
BRVM dividend notices. Used by `make bootstrap` so the site has real content
before the first live scrape; the daily collectors then keep it current.

Fields: (ticker, name, sector_fr, country, shares_outstanding, ref_close,
         {fiscal_year: net_dividend_fcfa})
"""

from __future__ import annotations

COMPANIES: list[dict] = [
    {"ticker": "ABJC", "name": "Servair Abidjan", "sector": "Distribution", "country": "Côte d'Ivoire", "shares": 10_912_000, "ref_close": 3180, "dividends": {2023: 206.2, 2025: 124}},
    {"ticker": "BICB", "name": "BIIC Bénin", "sector": "Finance", "country": "Bénin", "shares": 57_759_800, "ref_close": 6595, "dividends": {2024: 254.6, 2025: 254.6}},
    {"ticker": "BICC", "name": "BICI Côte d'Ivoire", "sector": "Finance", "country": "Côte d'Ivoire", "shares": 16_666_670, "ref_close": 28050, "dividends": {2023: 540.9, 2024: 831, 2025: 1157.2}},
    {"ticker": "BNBC", "name": "Bernabé Côte d'Ivoire", "sector": "Distribution", "country": "Côte d'Ivoire", "shares": 6_624_000, "ref_close": 1975, "dividends": {}},
    {"ticker": "BOAB", "name": "Bank of Africa Bénin", "sector": "Finance", "country": "Bénin", "shares": 40_561_048, "ref_close": 8700, "dividends": {2023: 706, 2024: 468, 2025: 585}},
    {"ticker": "BOABF", "name": "Bank of Africa Burkina Faso", "sector": "Finance", "country": "Burkina Faso", "shares": 44_000_000, "ref_close": 7200, "dividends": {2023: 704, 2024: 428, 2025: 397}},
    {"ticker": "BOAC", "name": "Bank of Africa Côte d'Ivoire", "sector": "Finance", "country": "Côte d'Ivoire", "shares": 40_000_000, "ref_close": 9875, "dividends": {2023: 684, 2024: 469, 2025: 594.53}},
    {"ticker": "BOAM", "name": "Bank of Africa Mali", "sector": "Finance", "country": "Mali", "shares": 27_450_000, "ref_close": 5630, "dividends": {2023: 144, 2024: 237.5, 2025: 305.04}},
    {"ticker": "BOAN", "name": "Bank of Africa Niger", "sector": "Finance", "country": "Niger", "shares": 20_800_000, "ref_close": 5200, "dividends": {2023: 609.15, 2024: 209.25}},
    {"ticker": "BOAS", "name": "Bank of Africa Sénégal", "sector": "Finance", "country": "Sénégal", "shares": 36_000_000, "ref_close": 7495, "dividends": {2023: 300, 2024: 350, 2025: 450}},
    {"ticker": "CABC", "name": "Sicable Côte d'Ivoire", "sector": "Industrie", "country": "Côte d'Ivoire", "shares": 5_920_000, "ref_close": 3850, "dividends": {2023: 79.58, 2024: 112.72, 2025: 152.02}},
    {"ticker": "CBIBF", "name": "Coris Bank International", "sector": "Finance", "country": "Burkina Faso", "shares": 32_000_000, "ref_close": 26450, "dividends": {2023: 790, 2024: 555, 2025: 900}},
    {"ticker": "CFAC", "name": "CFAO Motors Côte d'Ivoire", "sector": "Distribution", "country": "Côte d'Ivoire", "shares": 181_371_900, "ref_close": 1695, "dividends": {2023: 15.87, 2024: 7.04, 2025: 55.44}},
    {"ticker": "CIEC", "name": "Compagnie Ivoirienne d'Électricité", "sector": "Services publics", "country": "Côte d'Ivoire", "shares": 56_000_000, "ref_close": 5200, "dividends": {2023: 171, 2024: 158.4, 2025: 205.92}},
    {"ticker": "ECOC", "name": "Ecobank Côte d'Ivoire", "sector": "Finance", "country": "Côte d'Ivoire", "shares": 55_050_600, "ref_close": 15715, "dividends": {2023: 594, 2024: 707.52, 2025: 781}},
    {"ticker": "ETIT", "name": "Ecobank Transnational Incorporated", "sector": "Finance", "country": "Togo", "shares": 18_084_106_722, "ref_close": 70, "dividends": {2025: 0.92}},
    {"ticker": "FTSC", "name": "Filtisac Côte d'Ivoire", "sector": "Industrie", "country": "Côte d'Ivoire", "shares": 14_103_740, "ref_close": 1985, "dividends": {2023: 143.1}},
    {"ticker": "LNBB", "name": "Loterie Nationale du Bénin", "sector": "Distribution", "country": "Bénin", "shares": 20_000_000, "ref_close": 4310, "dividends": {2024: 275.5, 2025: 164.17}},
    {"ticker": "NEIC", "name": "NEI-CEDA", "sector": "Industrie", "country": "Côte d'Ivoire", "shares": 12_765_825, "ref_close": 2200, "dividends": {2023: 81.78, 2025: 140.39}},
    {"ticker": "NSBC", "name": "NSIA Banque Côte d'Ivoire", "sector": "Finance", "country": "Côte d'Ivoire", "shares": 24_734_572, "ref_close": 22900, "dividends": {2023: 454.83, 2024: 667.92, 2025: 675.98}},
    {"ticker": "NTLC", "name": "Nestlé Côte d'Ivoire", "sector": "Industrie", "country": "Côte d'Ivoire", "shares": 22_070_400, "ref_close": 16100, "dividends": {2023: 675, 2024: 721.6, 2025: 369.6}},
    {"ticker": "ONTBF", "name": "Onatel Burkina Faso", "sector": "Télécommunications", "country": "Burkina Faso", "shares": 68_000_000, "ref_close": 2745, "dividends": {2023: 266.45, 2024: 189.53, 2025: 145.32}},
    {"ticker": "ORAC", "name": "Orange Côte d'Ivoire", "sector": "Télécommunications", "country": "Côte d'Ivoire", "shares": 150_655_350, "ref_close": 16005, "dividends": {2023: 780, 2024: 660, 2025: 704}},
    {"ticker": "ORGT", "name": "Oragroup", "sector": "Finance", "country": "Togo", "shares": 69_415_031, "ref_close": 2680, "dividends": {}},
    {"ticker": "PALC", "name": "Palm Côte d'Ivoire", "sector": "Agriculture", "country": "Côte d'Ivoire", "shares": 15_459_316, "ref_close": 8800, "dividends": {2023: 563.31, 2024: 451.45, 2025: 441.4}},
    {"ticker": "PRSC", "name": "Tractafric Motors Côte d'Ivoire", "sector": "Distribution", "country": "Côte d'Ivoire", "shares": 10_240_000, "ref_close": 4630, "dividends": {2023: 182.7, 2024: 182.16, 2025: 183.92}},
    {"ticker": "SAFC", "name": "SAFCA", "sector": "Finance", "country": "Côte d'Ivoire", "shares": 8_119_750, "ref_close": 4580, "dividends": {}},
    {"ticker": "SCRC", "name": "Sucrivoire", "sector": "Agriculture", "country": "Côte d'Ivoire", "shares": 19_600_000, "ref_close": 3550, "dividends": {}},
    {"ticker": "SDCC", "name": "Sodeci", "sector": "Services publics", "country": "Côte d'Ivoire", "shares": 9_000_000, "ref_close": 11900, "dividends": {2023: 481.5, 2024: 352, 2025: 462}},
    {"ticker": "SDSC", "name": "Africa Global Logistics Côte d'Ivoire", "sector": "Transport", "country": "Côte d'Ivoire", "shares": 54_435_300, "ref_close": 2770, "dividends": {2023: 92, 2024: 92}},
    {"ticker": "SEMC", "name": "Eviosys Packaging Siem Côte d'Ivoire", "sector": "Industrie", "country": "Côte d'Ivoire", "shares": 25_189_600, "ref_close": 1430, "dividends": {}},
    {"ticker": "SGBC", "name": "Société Générale Côte d'Ivoire", "sector": "Finance", "country": "Côte d'Ivoire", "shares": 31_111_110, "ref_close": 38000, "dividends": {2023: 1553.85, 2024: 1639.44, 2025: 2293.28}},
    {"ticker": "SHEC", "name": "Vivo Energy Côte d'Ivoire", "sector": "Distribution", "country": "Côte d'Ivoire", "shares": 63_000_000, "ref_close": 2205, "dividends": {2023: 57, 2024: 75.29, 2025: 85.07}},
    {"ticker": "SIBC", "name": "Société Ivoirienne de Banque", "sector": "Finance", "country": "Côte d'Ivoire", "shares": 100_000_000, "ref_close": 8800, "dividends": {2023: 495, 2024: 330, 2025: 374}},
    {"ticker": "SICC", "name": "Sicor Côte d'Ivoire", "sector": "Industrie", "country": "Côte d'Ivoire", "shares": 600_000, "ref_close": 5600, "dividends": {}},
    {"ticker": "SIVC", "name": "Erium Côte d'Ivoire", "sector": "Industrie", "country": "Côte d'Ivoire", "shares": 8_734_000, "ref_close": 2250, "dividends": {}},
    {"ticker": "SLBC", "name": "Solibra", "sector": "Industrie", "country": "Côte d'Ivoire", "shares": 16_460_840, "ref_close": 38995, "dividends": {2023: 2700, 2024: 1073.6, 2025: 1871.76}},
    {"ticker": "SMBC", "name": "SMB Côte d'Ivoire", "sector": "Industrie", "country": "Côte d'Ivoire", "shares": 7_795_200, "ref_close": 16650, "dividends": {2023: 1080, 2024: 609, 2025: 704}},
    {"ticker": "SNTS", "name": "Sonatel", "sector": "Télécommunications", "country": "Sénégal", "shares": 100_000_000, "ref_close": 31500, "dividends": {2023: 1575, 2024: 1655, 2025: 1740}},
    {"ticker": "SOGC", "name": "SOGB", "sector": "Agriculture", "country": "Côte d'Ivoire", "shares": 21_601_840, "ref_close": 8200, "dividends": {2023: 207, 2024: 528, 2025: 501.6}},
    {"ticker": "SPHC", "name": "SAPH", "sector": "Agriculture", "country": "Côte d'Ivoire", "shares": 25_558_005, "ref_close": 7350, "dividends": {2023: 64.8, 2024: 323.84, 2025: 430.32}},
    {"ticker": "STAC", "name": "Setao Côte d'Ivoire", "sector": "Industrie", "country": "Côte d'Ivoire", "shares": 13_440_000, "ref_close": 2990, "dividends": {}},
    {"ticker": "STBC", "name": "Sitab Côte d'Ivoire", "sector": "Industrie", "country": "Côte d'Ivoire", "shares": 17_955_000, "ref_close": 23500, "dividends": {2023: 675, 2024: 2090, 2025: 1707}},
    {"ticker": "TTLC", "name": "TotalEnergies Marketing Côte d'Ivoire", "sector": "Distribution", "country": "Côte d'Ivoire", "shares": 62_961_600, "ref_close": 2950, "dividends": {2023: 199.54, 2024: 195.67, 2025: 139.77}},
    {"ticker": "TTLS", "name": "TotalEnergies Marketing Sénégal", "sector": "Distribution", "country": "Sénégal", "shares": 32_577_700, "ref_close": 3700, "dividends": {2023: 207.58, 2024: 222.4, 2025: 176.65}},
    {"ticker": "UNLC", "name": "Unilever Côte d'Ivoire", "sector": "Industrie", "country": "Côte d'Ivoire", "shares": 9_183_400, "ref_close": 52000, "dividends": {}},
    {"ticker": "UNXC", "name": "Uniwax", "sector": "Industrie", "country": "Côte d'Ivoire", "shares": 20_750_000, "ref_close": 1890, "dividends": {}},
]
