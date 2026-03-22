import "next-auth";
import type { AgencyRole } from "@/lib/types/agencies";
import type { SubscriptionStatus } from "@/lib/types/subscriptions";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "broker" | "admin";
      email: string;
      name?: string | null;
      image?: string | null;
      emailVerified?: Date | null;
      agencyId?: string | null;
      agencyRole?: AgencyRole | null;
      agencyName?: string | null;
      subscriptionStatus?: SubscriptionStatus | null;
    };
  }

  interface User {
    id: string;
    role: "broker" | "admin";
    email: string;
    name?: string | null;
    emailVerified?: Date | null;
    agencyId?: string | null;
    agencyRole?: AgencyRole | null;
    agencyName?: string | null;
    subscriptionStatus?: SubscriptionStatus | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "broker" | "admin";
    emailVerified?: Date | null;
    agencyId?: string | null;
    agencyRole?: AgencyRole | null;
    agencyName?: string | null;
    subscriptionStatus?: SubscriptionStatus | null;
  }
}
