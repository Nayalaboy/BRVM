import NextAuth, { type NextAuthConfig } from "next-auth";
import type { Provider } from "next-auth/providers";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import {
  accounts,
  db,
  entitlements,
  sessions,
  users,
  verificationTokens,
} from "@brvm/db";
import { track } from "@brvm/analytics";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "user" | "admin";
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }
}

// Explicit opt-in via env; additionally hard-blocked on production Vercel
// deployments so the flag cannot leak premium/dev access there.
const devLoginEnabled =
  process.env.AUTH_DEV_LOGIN === "true" &&
  process.env.VERCEL_ENV !== "production";

function buildProviders(): Provider[] {
  const providers: Provider[] = [];

  if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
    providers.push(
      Google({ allowDangerousEmailAccountLinking: true }),
    );
  }

  if (process.env.AUTH_RESEND_KEY) {
    providers.push(
      Resend({
        apiKey: process.env.AUTH_RESEND_KEY,
        from: process.env.AUTH_EMAIL_FROM ?? "onboarding@resend.dev",
      }),
    );
  }

  if (devLoginEnabled) {
    providers.push(
      Credentials({
        id: "dev-login",
        name: "Dev login",
        credentials: {
          email: { label: "Email", type: "email" },
          locale: { label: "Locale", type: "text" },
        },
        async authorize(credentials) {
          const email = String(credentials?.email ?? "").toLowerCase().trim();
          if (!email || !email.includes("@")) return null;
          const locale = credentials?.locale === "en" ? "en" : "fr";

          const existing = await db.query.users.findFirst({
            where: eq(users.email, email),
          });
          if (existing) return existing;

          const [created] = await db
            .insert(users)
            .values({
              email,
              name: email.split("@")[0],
              emailVerified: new Date(),
              locale,
            })
            .returning();
          await ensureEntitlementRow(created.id);
          await track(
            "signup",
            { method: "dev", locale },
            { userId: created.id },
          );
          return created;
        },
      }),
    );
  }

  return providers;
}

async function ensureEntitlementRow(userId: string) {
  await db
    .insert(entitlements)
    .values({ userId, plan: "free", status: "active" })
    .onConflictDoNothing();
}

export const authConfig: NextAuthConfig = {
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  // JWT sessions so the Credentials dev provider works alongside the adapter.
  session: { strategy: "jwt" },
  trustHost: true,
  providers: buildProviders(),
  pages: {
    signIn: "/connexion",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
        token.role = (user as { role?: "user" | "admin" }).role ?? "user";
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
        session.user.role = (token.role as "user" | "admin") ?? "user";
      }
      return session;
    },
  },
  events: {
    // Fires for adapter-created users (Google, magic link) — dev login
    // handles its own tracking in authorize().
    async createUser({ user }) {
      if (!user.id) return;
      await ensureEntitlementRow(user.id);
      await track(
        "signup",
        { method: user.image ? "google" : "email", locale: "fr" },
        { userId: user.id },
      );
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

export const isDevLoginEnabled = devLoginEnabled;
export const isGoogleEnabled = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
);
export const isEmailEnabled = Boolean(process.env.AUTH_RESEND_KEY);
