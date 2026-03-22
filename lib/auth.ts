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
          .select("role, status, agency_id, agency_role")
          .eq("id", userRow.id)
          .single();
        const role = (profile?.role as "broker" | "admin") ?? "broker";

        if (role === "broker") {
          if (profile?.agency_id) {
            // Agency-based broker: agency must be active
            const { data: agency } = await supabase
              .from("agencies")
              .select("status, name")
              .eq("id", profile.agency_id)
              .single();
            if (!agency || agency.status !== "active") return null;

            // Get subscription status
            const { data: subscription } = await supabase
              .from("agency_subscriptions")
              .select("status, grace_period_end")
              .eq("agency_id", profile.agency_id)
              .in("status", ["active", "trialing", "past_due", "pending"])
              .order("created_at", { ascending: false })
              .limit(1)
              .single();

            let subscriptionStatus: string | null = null;
            if (subscription) {
              subscriptionStatus = subscription.status;
              if (
                subscription.status === "past_due" &&
                subscription.grace_period_end &&
                new Date(subscription.grace_period_end) < new Date()
              ) {
                subscriptionStatus = "expired";
              }
            }

            return {
              id: userRow.id,
              email: userRow.email,
              emailVerified: userRow.email_verified_at ? new Date(userRow.email_verified_at) : null,
              role,
              agencyId: profile.agency_id,
              agencyRole: profile.agency_role as "owner" | "member" | null,
              agencyName: agency.name,
              subscriptionStatus: subscriptionStatus as
                | "pending"
                | "active"
                | "past_due"
                | "cancelled"
                | "expired"
                | "trialing"
                | null,
            };
          }
          // Legacy broker without agency: must have active status
          if (profile?.status !== "active") return null;
        }

        return {
          id: userRow.id,
          email: userRow.email,
          emailVerified: userRow.email_verified_at ? new Date(userRow.email_verified_at) : null,
          role,
          agencyId: profile?.agency_id ?? null,
          agencyRole: (profile?.agency_role as "owner" | "member" | null) ?? null,
          agencyName: null,
          subscriptionStatus: null,
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
        token.agencyId = user.agencyId;
        token.agencyRole = user.agencyRole;
        token.agencyName = user.agencyName;
        token.subscriptionStatus = user.subscriptionStatus;
        token.subscriptionCheckedAt = Date.now();
      }

      // Refresh subscription status from DB periodically
      // Check every 10s if no active sub (waiting for payment), every 5 min if active
      const agencyId = token.agencyId as string | null;
      const lastChecked = (token.subscriptionCheckedAt as number) ?? 0;
      const currentStatus = token.subscriptionStatus as string | null;
      const refreshInterval = ["active", "trialing"].includes(currentStatus ?? "") ? 300_000 : 10_000;
      if (agencyId && Date.now() - lastChecked > refreshInterval) {
        const supabase = createServiceRoleClient();
        const { data: sub } = await supabase
          .from("agency_subscriptions")
          .select("status, grace_period_end")
          .eq("agency_id", agencyId)
          .in("status", ["active", "trialing", "past_due"])
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (sub) {
          let status = sub.status;
          if (
            status === "past_due" &&
            sub.grace_period_end &&
            new Date(sub.grace_period_end) < new Date()
          ) {
            status = "expired";
          }
          token.subscriptionStatus = status;
        } else {
          token.subscriptionStatus = null;
        }
        token.subscriptionCheckedAt = Date.now();
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "broker" | "admin";
        session.user.emailVerified = token.emailVerified as Date | null | undefined;
        session.user.agencyId = (token.agencyId as string) ?? null;
        session.user.agencyRole = (token.agencyRole as "owner" | "member") ?? null;
        session.user.agencyName = (token.agencyName as string) ?? null;
        session.user.subscriptionStatus =
          (token.subscriptionStatus as
            | "pending"
            | "active"
            | "past_due"
            | "cancelled"
            | "expired"
            | "trialing") ?? null;
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
          status: "pending",
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
