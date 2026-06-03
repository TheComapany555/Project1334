import "next-auth";
import type { AgencyRole } from "@/lib/types/agencies";
import type { SubscriptionStatus } from "@/lib/types/subscriptions";

/** Set on the session/token while an admin or agency owner is managing a broker. */
export interface Impersonator {
  id: string;
  role: "broker" | "admin" | "user";
  name?: string | null;
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "broker" | "admin" | "user";
      email: string;
      name?: string | null;
      image?: string | null;
      emailVerified?: Date | null;
      agencyId?: string | null;
      agencyRole?: AgencyRole | null;
      agencyName?: string | null;
      subscriptionStatus?: SubscriptionStatus | null;
      /** Present only inside a "manage as broker" session — the real actor. */
      impersonator?: Impersonator | null;
    };
  }

  interface User {
    id: string;
    role: "broker" | "admin" | "user";
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
    role?: "broker" | "admin" | "user";
    emailVerified?: Date | null;
    agencyId?: string | null;
    agencyRole?: AgencyRole | null;
    agencyName?: string | null;
    subscriptionStatus?: SubscriptionStatus | null;
    subscriptionCheckedAt?: number;
    /** Present only inside a "manage as broker" session — the real actor. */
    impersonator?: Impersonator | null;
  }
}
