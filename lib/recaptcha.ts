const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY;

export async function verifyRecaptcha(token: string | null): Promise<boolean> {
  if (!RECAPTCHA_SECRET) return true; // skip in dev if not configured
  if (!token) return false;

  const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      secret: RECAPTCHA_SECRET,
      response: token,
    }),
  });

  const data = await res.json();
  return data.success === true;
}
