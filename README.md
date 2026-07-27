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
make market-refresh   # cours + indices officiels, contrôle de date (rapide)
make daily            # run complet : dividendes + BOC + récap vérifié
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

**Archive BOC et backfill.** `make boc-inventory since=2015-01-01` inventorie
les deux surfaces officielles sans télécharger les PDF. Puis
`make backfill since=2015-01-01 stage=download limit=100` archive un lot
reprenable et dédupliqué par hash. Les états, tentatives et erreurs sont
conservés dans `archive_items`. Enchaînez avec `stage=parse`, puis `stage=load`:
les lignes passent d'abord par une table de staging et un contrôle minimum de
couverture. Chaque cours chargé conserve le document BOC, la page et la section;
aucune lacune ou mise en page inconnue n'est ignorée silencieusement.

**Modifier le schéma.** Éditez `pipeline/src/brvm_pipeline/models.py`, puis
`make revision m="…"` → relisez la migration → `make migrate`.

**Auth légère (Phase 1).** Le schéma utilisateur et les liens à usage unique
appartiennent au pipeline; Auth.js utilise des sessions JWT et synchronise
Google via l'API FastAPI. Configurez `AUTH_SECRET`, puis la même valeur aléatoire
dans `AUTH_SYNC_SECRET` et `BRVM_AUTH_SYNC_SECRET`. Le lien e-mail utilise
`BRVM_RESEND_API_KEY`; Google nécessite `AUTH_GOOGLE_ID` et
`AUTH_GOOGLE_SECRET`. Aucun contenu public n'est protégé par une connexion.

**Décisions officielles.** `make intelligence` archive chaque semaine les
publications officielles des conseils des ministres des huit États de l'UEMOA
(Bénin, Burkina Faso, Côte d'Ivoire, Guinée-Bissau, Mali, Niger, Sénégal et
Togo), les avis BRVM et les publications UMOA-Titres. Configurez
`BRVM_AMF_UMOA_PUBLICATIONS_URL` uniquement avec l'index officiel vérifié de
l'AMF-UMOA. Une source sans index officiel courant peut légitimement retourner
zéro document; aucun média ou miroir ne la remplace. Les fichiers/pages bruts sont
dédupliqués par SHA-256 dans le même stockage immuable que les BOC.

Inspectez la file dans `gov_documents`, puis créez un événement relu :

```bash
make tag-event document_id=42 event_type=nomination \
  summary_fr="Le Conseil a nommé un nouveau directeur général." \
  tickers=TEST event_date=2026-07-24
```

Types autorisés : `tarification`, `fiscalité`, `participation_etat`,
`privatisation_levee_fonds`, `reglementation_sectorielle`, `nomination`.
Ajoutez `review_status=pending` si une seconde relecture reste nécessaire.
Seuls les événements `reviewed` sortent sur `/events`, `/decisions` et les
fiches sociétés. Résumez un fait passé en une phrase, sans causalité supposée,
prévision d'impact ou signal d'achat/vente; conservez toujours l'URL officielle
et la référence `GOV-<id>`.

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
