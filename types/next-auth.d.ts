import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "broker" | "admin";
      email: string;
      name?: string | null;
      image?: string | null;
      emailVerified?: Date | null;
    };
  }

  interface User {
    id: string;
    role: "broker" | "admin";
    email: string;
    name?: string | null;
    emailVerified?: Date | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "broker" | "admin";
    emailVerified?: Date | null;
  }
}
