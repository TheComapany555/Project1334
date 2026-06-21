import { z } from "zod";

/** Reusable field validators used across multiple forms. */

export const emailField = z.string().email("Enter a valid email address");

/** Shared email pattern (matches the regex used across the server actions). */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Plain (non-zod) validators usable on both client and server. */
export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

/**
 * Loose phone validation: digits with optional leading "+" and common
 * separators (spaces, dashes, parentheses, dots) — no letters. Must contain
 * 8–15 digits (E.164 caps at 15; AU mobiles are 10). Returns true for an empty
 * string so callers can treat the field as optional.
 */
export function isValidPhone(value: string): boolean {
  const v = value.trim();
  if (!v) return true;
  if (!/^\+?[\d\s().-]+$/.test(v)) return false; // rejects letters etc.
  const digits = v.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

export const passwordField = z
  .string()
  .min(8, "Password must be at least 8 characters");

export const passwordConfirmRefine = {
  check: (data: { password: string; confirm: string }) =>
    data.password === data.confirm,
  message: "Passwords do not match",
  path: ["confirm"] as [string],
};

export const nameField = z
  .string()
  .min(1, "Name is required")
  .max(200);

export const optionalUrl = z
  .string()
  .url("Enter a valid URL")
  .optional()
  .or(z.literal(""));

export const optionalEmail = z
  .string()
  .email("Enter a valid email address")
  .optional()
  .or(z.literal(""));

export const slugField = z
  .string()
  .max(100)
  .regex(/^[a-z0-9-]*$/, "Only lowercase letters, numbers and hyphens")
  .optional()
  .or(z.literal(""));
