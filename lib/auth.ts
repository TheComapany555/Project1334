import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const supabase = createServiceRoleClient();
        const { data: userRow, error: userError } = await supabase
          .from("users")
          .select("id, email, password_hash, email_verified_at")
          .eq("email", credentials.email.toLowerCase().trim())
          .single();
        if (userError || !userRow) return null;
        const valid = await bcrypt.compare(credentials.password, userRow.password_hash);
        if (!valid) return null;
        if (!userRow.email_verified_at) return null;
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, status")
          .eq("id", userRow.id)
          .single();
        const role = (profile?.role as "broker" | "admin") ?? "broker";
        if (role === "broker" && profile?.status === "disabled") return null;
        return {
          id: userRow.id,
          email: userRow.email,
          emailVerified: userRow.email_verified_at ? new Date(userRow.email_verified_at) : null,
          role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.emailVerified = user.emailVerified;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "broker" | "admin";
        session.user.emailVerified = token.emailVerified as Date | null | undefined;
      }
      return session;
    },
    async signIn({ user }) {
      if (!user.id) return false;
      const supabase = createServiceRoleClient();
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();
      if (!existing) {
        await supabase.from("profiles").insert({
          id: user.id,
          role: "broker",
          updated_at: new Date().toISOString(),
        });
      }
      return true;
    },
  },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
    verifyRequest: "/auth/verify",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
