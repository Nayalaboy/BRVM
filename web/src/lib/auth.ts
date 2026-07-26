import NextAuth, {type NextAuthConfig} from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import {cookies} from "next/headers";

type PipelineUser = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  locale: "fr" | "en";
  role: "user" | "admin";
};

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

const pipelineApi = process.env.PIPELINE_API_URL ?? "http://localhost:8000";

async function pipelineRequest(path: string, body: object): Promise<PipelineUser> {
  const response = await fetch(`${pipelineApi}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(process.env.AUTH_SYNC_SECRET
        ? {"x-aqlee-auth-secret": process.env.AUTH_SYNC_SECRET}
        : {}),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`pipeline auth request failed: ${response.status}`);
  return response.json() as Promise<PipelineUser>;
}

const providers: NextAuthConfig["providers"] = [
  Credentials({
    id: "magic-link",
    name: "Email",
    credentials: {
      email: {label: "Email", type: "email"},
      token: {label: "Token", type: "text"},
      locale: {label: "Locale", type: "text"},
    },
    async authorize(credentials) {
      const email = String(credentials.email ?? "").trim().toLowerCase();
      const token = String(credentials.token ?? "");
      const locale = credentials.locale === "en" ? "en" : "fr";
      if (!email || !token) return null;
      try {
        return await pipelineRequest("/auth/magic/consume", {email, token, locale});
      } catch {
        return null;
      }
    },
  }),
];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(Google({allowDangerousEmailAccountLinking: true}));
}

export const authConfig: NextAuthConfig = {
  trustHost: true,
  session: {strategy: "jwt"},
  providers,
  pages: {signIn: "/connexion"},
  callbacks: {
    async signIn({user, account}) {
      if (account?.provider !== "google") return true;
      if (!user.email || !process.env.AUTH_SYNC_SECRET) return false;
      const locale = (await cookies()).get("aqlee-auth-locale")?.value === "en" ? "en" : "fr";
      const synced = await pipelineRequest("/auth/users/upsert", {
        email: user.email,
        name: user.name,
        image: user.image,
        locale,
      });
      user.id = synced.id;
      return true;
    },
    async jwt({token, user}) {
      if (user?.id) {
        token.sub = user.id;
        token.role = (user as PipelineUser).role ?? "user";
      }
      return token;
    },
    async session({session, token}) {
      if (token.sub) {
        session.user.id = token.sub;
        session.user.role = (token.role as "user" | "admin") ?? "user";
      }
      return session;
    },
  },
};

export const {handlers, auth, signIn, signOut} = NextAuth(authConfig);
export const isGoogleAuthEnabled = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
);
