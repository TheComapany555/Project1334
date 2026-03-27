import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);

export type MobileTokenPayload = {
  sub: string;
  email: string;
  role: string;
  agencyId: string | null;
  agencyRole: string | null;
  subscriptionStatus: string | null;
};

export async function signMobileToken(payload: MobileTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function verifyMobileToken(token: string): Promise<MobileTokenPayload> {
  const { payload } = await jwtVerify(token, secret);
  return payload as unknown as MobileTokenPayload;
}
