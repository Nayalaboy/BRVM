# Aqlee Invest

Intelligence d'investissement pour la **BRVM** (Bourse Régionale des Valeurs
Mobilières, la bourse régionale de l'UEMOA — 8 pays d'Afrique de l'Ouest), en
**français d'abord**. Calendrier des dividendes, fiches sociétés, récap
quotidien vérifié, centre IPO/marché primaire, vérificateur d'agrément SGI et
lexique — gratuits.

> **Produit d'information, pas un conseil en investissement.** Chaque page porte
> un avertissement (FR + EN) : informations à but informatif et éducatif
> uniquement, aucun conseil personnalisé, les performances passées ne préjugent
> pas des performances futures. Aucune connexion, aucun paiement en Phase 0.

## Architecture

Monorepo, deux composants indépendants :

```
pipeline/   Python 3.12 — collecte (quotes, dividendes, indices, documents),
            base relationnelle (SQLite local / Postgres prod, SQLAlchemy +
            Alembic), métriques dérivées, et une API FastAPI read-only.
web/        Next.js 16 (App Router, next-intl FR/EN) — le site public, qui
            consomme UNIQUEMENT l'API FastAPI (jamais la base directement).
```

Le **pipeline possède le schéma** ; le **site lit l'API**. Cible d'hébergement
< 20 $/mois — voir [`DEPLOYMENT.md`](DEPLOYMENT.md).

## Démarrage local

Prérequis : Python ≥ 3.12, Node ≥ 22, pnpm ≥ 10. Aucun service externe requis
(SQLite en local).

```bash
# 1) Pipeline : venv + schéma + données réelles (47 sociétés, dividendes)
make bootstrap
make daily            # collecte la dernière séance depuis brvm.org (idempotent)
make api              # API read-only sur http://localhost:8000/docs

# 2) Site (dans un autre terminal)
pnpm install
pnpm dev              # http://localhost:3000  (lit l'API ci-dessus)
```

## Le site (Phase 0)

| Route (FR / EN) | Contenu |
|---|---|
| `/` | Résumé de marché (BRVM Composite, plus forts mouvements), prochains dividendes, capture e-mail |
| `/dividendes` · `/en/dividends` | Calendrier trié/filtrable + rendement + **export ICS** (global et par société) |
| `/societes/[ticker]` · `/en/companies/[ticker]` | Fiche : cours (graphique SVG), stats, historique complet des dividendes |
| `/verifier` · `/en/verify` | Vérificateur d'agrément SGI (registre officiel) |
| `/operations` · `/en/ipos` | Centre IPO & marché primaire (conditions en français simple) |
| `/lexique` · `/en/glossary` | Lexique SEO (FCP, OPCVM, compte-titres, capitalisation vs prix…) |
| `/recap/[date]` | Récap quotidien vérifié, chaque chiffre traçable au **BOC** |
| `/newsletter` | Inscription (double opt-in) + archives |

SEO : `sitemap.xml`, `robots.txt`, métadonnées FR, OpenGraph. Analytics Plausible
(activable par variable d'env). Capture e-mail via Buttondown ou Resend (double
opt-in délégué au fournisseur ; stocke locale + profil diaspora/résident/pro).

## Runbook

**Ajouter une société.** Ajoutez-la à
`pipeline/src/brvm_pipeline/data/companies.py` (ticker, nom, secteur, pays,
titres, cours de référence, dividendes) puis `make seed`. Dès qu'elle apparaît
sur brvm.org, le collecteur quotidien la met à jour automatiquement.

**Ajouter une opération (IPO/APE).** Remplissez le modèle dans
`pipeline/src/brvm_pipeline/data/operations.py` depuis la note d'information
officielle (chaque champ vérifié) puis `make registry`.

**Backfill.** `make backfill since=2026-01-01` (brvm.org ne sert que la dernière
séance ; l'historique OHLCV profond nécessite une source dédiée — suivi).

**Modifier le schéma.** Éditez `pipeline/src/brvm_pipeline/models.py`, puis
`make revision m="…"` → relisez la migration → `make migrate`.

**Déployer.** Voir [`DEPLOYMENT.md`](DEPLOYMENT.md) (Vercel + Postgres managé +
API FastAPI + cron GitHub Actions).

## Qualité & vérification

```bash
make test            # pipeline : parsers testés contre de vraies pages BRVM
make lint            # ruff
pnpm typecheck && pnpm build   # site
```

Le pipeline exécute à chaque run : contrôles qualité (prix négatifs, volumes
aberrants par z-score, tickers manquants), recalcul des métriques (rendement,
plus haut/bas 52 sem., YTD, volume moyen 20j), et un récap **publié uniquement
si les contrôles passent**. Un échec envoie une alerte e-mail.

## Données

Sociétés, secteurs, nombre de titres et cours : brvm.org. Dividendes : avis
officiels « Paiement de dividendes » (net/action, exercice, dates), recoupés
avec RichBourse/Sikafinance. Registre SGI : CREPMF. Le seed de démarrage utilise
des données **réelles** (clôture du 2026-07-22) pour que le site soit peuplé
avant la première collecte.

## Conformité

- Aucun conseil personnalisé ; service informationnel et éducatif.
- Récap traçable (« Source : BOC du [date] »), jamais publié si un contrôle
  qualité échoue.
- Pas de courtage, pas de routage d'ordres : le CTA « ouvrir un compte » est un
  simple lien sortant.
- Le vérificateur d'agrément ne conclut jamais « non agréé » sur une absence de
  résultat ; renvoie toujours vers le CREPMF.

## Phases ultérieures

Ingestion PDF (BOC, rapports) + RAG, copilote de recherche IA avec citations,
résumés de résultats, prévisions de dividendes, et une offre Premium (le
squelette Auth.js + Stripe est conservé sur la branche `legacy-premium`).
