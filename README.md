# BRVM Research

Recherche actions et données de marché pour la Bourse Régionale des Valeurs
Mobilières (BRVM), en français d'abord. Calendrier des dividendes et fiches
sociétés gratuits ; copilote de recherche IA, screener et prévisions de
dividendes en abonnement Premium.

## Architecture

```
apps/web            Next.js 16 (App Router) — site public, auth, billing, copilot UI
packages/db         Schéma Drizzle + migrations + seed (Postgres 16 + pgvector)
packages/analytics  Événements produit typés (signup, upgrade, cancel, …)
services/ingestion  Worker Python — ingestion des PDF (BOC, rapports annuels), RAG
```

Cible d'infrastructure : **Vercel** (web) + **un Postgres managé** (avec
pgvector) + **un worker** (Railway ou Fly) pour les jobs d'ingestion.

### Feuille de route

| Étape | Contenu | Statut |
|---|---|---|
| 0 | Monorepo, schéma, calendrier des dividendes, fiches sociétés, i18n FR/EN | ✅ |
| 1 | Auth (Auth.js) + Stripe (abonnements, entitlements, période de grâce) + gating | ✅ |
| 2 | Ingestion PDF (OCR, chunking tables) + RAG hybride (pgvector + BM25) | ⏳ |
| 3 | UI copilote (streaming, citations, garde-fou réglementaire) | ⏳ |
| 4 | Résumés de résultats automatisés + newsletter (file de relecture) | ⏳ |
| 5 | Screener + prévisions de dividendes (Premium) | ⏳ |
| 6 | Admin (santé ingestion, files de revue, métriques MRR) | ⏳ |

## Démarrage local (runbook)

Prérequis : Node ≥ 22, pnpm ≥ 10, Docker (ou un Postgres 16 local avec
l'extension pgvector).

```bash
pnpm install
cp .env.example .env          # ajustez si besoin — les valeurs par défaut suffisent en local

# Une commande : démarre Postgres (docker), applique les migrations, insère les fixtures
pnpm setup:local

# Lance le site
pnpm dev                      # http://localhost:3000
```

Sans Docker : pointez `DATABASE_URL` vers votre Postgres puis
`pnpm db:migrate && pnpm db:seed`.

### Connexion en local

`AUTH_DEV_LOGIN=true` (défaut du `.env.example`) active un formulaire de
connexion développeur sans mot de passe sur `/connexion` — n'importe quelle
adresse e-mail crée un compte. Google et le magic link (Resend) s'activent en
renseignant leurs clés. **Ne jamais activer `AUTH_DEV_LOGIN` en production**
(il est de toute façon bloqué sur les déploiements Vercel production).

### Stripe en local

1. Créez un produit « Premium » (9 $/mois) en mode test, copiez le price id
   dans `STRIPE_PRICE_PREMIUM_MONTHLY`, la clé secrète dans
   `STRIPE_SECRET_KEY`.
2. Redirigez les webhooks :
   `stripe listen --forward-to localhost:3000/api/stripe/webhook`
   et copiez le secret dans `STRIPE_WEBHOOK_SECRET`.
3. Checkout de test : carte `4242 4242 4242 4242`. Le webhook alimente les
   tables `subscriptions` puis `entitlements` ; l'accès Premium se débloque
   immédiatement.

Sans clés Stripe, vous pouvez simuler l'effet du webhook :

```bash
cd apps/web
pnpm exec tsx scripts/simulate-webhook.ts demo@example.com active    # premium
pnpm exec tsx scripts/simulate-webhook.ts demo@example.com past_due  # période de grâce
pnpm exec tsx scripts/simulate-webhook.ts demo@example.com canceled  # retour au gratuit
```

En cas d'échec de paiement (`past_due`), l'accès Premium est conservé
`BILLING_GRACE_PERIOD_DAYS` jours (7 par défaut). La TVA européenne est gérée
par Stripe Tax (`automatic_tax` activé au checkout ; désactivable avec
`STRIPE_AUTOMATIC_TAX=false` tant que Stripe Tax n'est pas configuré sur le
compte).

### Tests

```bash
pnpm test        # unitaires (formatage FCFA, logique d'entitlement/grâce)
pnpm typecheck
pnpm build
```

### Worker d'ingestion (squelette — étape 2)

```bash
pip install -e "services/ingestion[dev]"
brvm-ingest status     # file d'attente des documents
```

## Variables d'environnement

Voir [`.env.example`](.env.example). Points notables :

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Postgres 16 + pgvector |
| `AUTH_SECRET`, `AUTH_GOOGLE_*`, `AUTH_RESEND_KEY` | Auth.js (Google + magic link) |
| `AUTH_DEV_LOGIN` | Connexion dev sans mot de passe (local uniquement) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PREMIUM_MONTHLY` | Abonnements |
| `BILLING_GRACE_PERIOD_DAYS` | Durée de grâce après échec de paiement |
| `NEXT_PUBLIC_SGI_REFERRAL_URL` | Lien de parrainage simple vers une SGI partenaire (aucune donnée transmise) |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_BUDGET_USD` | Copilote (étape 2+) |

## Conformité

- Aucun conseil en investissement personnalisé : le service est informationnel
  et éducatif ; le copilote refusera les demandes de conseil personnalisé
  (garde-fou système + post-filtre, refus journalisés — étape 3).
- Bandeau « généré par IA » sur tout contenu automatisé, avec relecture
  humaine avant publication (étape 4).
- CGU et politique de confidentialité : textes provisoires dans
  `/conditions` et `/confidentialite`, à faire relire par un conseil.
- Pas de courtage, pas de routage d'ordres, pas d'ouverture de compte : le CTA
  « ouvrir un compte titres » est un simple lien sortant configuré par env.

## Données

Les fixtures (`packages/db/src/fixtures.ts`) utilisent les vraies sociétés et
symboles de la cote BRVM mais des **montants illustratifs** pour le
développement. Le pipeline de production les remplace par les valeurs
extraites des bulletins officiels de la cote (BOC).
