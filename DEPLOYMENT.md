# Déploiement (Phase 0)

Trois composants, hébergement cible **< 20 $/mois** :

| Composant | Où | Coût |
|---|---|---|
| Site Next.js (`web/`) | **Vercel** (Hobby) | 0 $ |
| API données (`pipeline/…/api`, FastAPI) | **Fly.io / Railway** (free tier) ou fonctions Python Vercel | 0–5 $ |
| Base Postgres (pipeline) | **Neon / Supabase** (free) | 0 $ |
| Cron quotidien | **GitHub Actions** (`pipeline-daily`) | 0 $ |
| PDF BOC (optionnel) | **Cloudflare R2** (free 10 Go) | 0 $ |

Le site **ne lit jamais la base directement** : il consomme l'API FastAPI
(read-only). Aucune authentification ni paiement en Phase 0.

## Particularité du dépôt

Le projet vit dans le sous-dossier **`BRVM/`** du dépôt git. Le **Root Directory**
Vercel doit donc pointer sur `BRVM/web`.

## 1. Base de données + API

1. Provisionner un Postgres managé (Neon/Supabase) — noter le DSN.
2. Appliquer le schéma une fois :
   ```bash
   cd BRVM/pipeline
   BRVM_DATABASE_URL="postgresql+psycopg://…" alembic upgrade head
   BRVM_DATABASE_URL="…" python -m brvm_pipeline.run seed          # 47 sociétés + dividendes réels
   BRVM_DATABASE_URL="…" python -m brvm_pipeline.run weekly-registry
   ```
3. Déployer l'API (`brvm_pipeline.api.main:app`, stateless, read-only) sur
   Fly.io/Railway avec `BRVM_DATABASE_URL` et `BRVM_API_CORS_ORIGINS=https://<domaine>`.
   Noter son URL publique → `PIPELINE_API_URL`.

## 2. Cron quotidien (GitHub Actions)

`pipeline-daily` exécute un rafraîchissement léger des cours et indices à
15:30 puis 16:30 GMT (`market-refresh`), avec contrôle de date/source à chaque
passage. Le run complet de 18:30 GMT collecte aussi les dividendes et le BOC,
puis ne publie le récapitulatif que si ses contrôles passent. Ajouter les
secrets `DATABASE_URL`, `RESEND_API_KEY`, `ALERT_EMAIL_TO` (voir
`.github/workflows/daily.yml`).

## 3. Site Vercel (`web/`)

1. Add New → Project → importer le dépôt.
2. **Root Directory** = `BRVM/web`. Framework : Next.js (détecté). Install/build
   fournis par [`web/vercel.json`](web/vercel.json).
   > Le build **ne nécessite pas** de base ni d'API : toutes les pages data sont
   > dynamiques. `PIPELINE_API_URL` n'est requis qu'au runtime.
3. Variables d'environnement :

| Variable | Portée | Rôle |
|---|---|---|
| `PIPELINE_API_URL` | Runtime | URL de l'API FastAPI. |
| `NEXT_PUBLIC_APP_URL` | **Build** | URL publique (sitemap, OpenGraph). |
| `NEXT_PUBLIC_SGI_REFERRAL_URL` | Build | Lien « ouvrir un compte » (facultatif). |
| `EMAIL_PROVIDER` | Runtime | `buttondown` \| `resend` \| absent (no-op). |
| `BUTTONDOWN_API_KEY` | Runtime | Si `buttondown` (double opt-in activé côté Buttondown). |
| `RESEND_API_KEY` / `RESEND_AUDIENCE_ID` | Runtime | Si `resend`. |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | Build | Active Plausible (facultatif). |

## Notes

- **Double opt-in** : activez-le sur le newsletter Buttondown / l'audience Resend.
- Le worker d'ingestion PDF/RAG et le copilote IA arrivent en phases ultérieures.
- Le code auth/billing (Auth.js + Stripe) est conservé sur la branche
  `legacy-premium` pour une phase Premium future.
