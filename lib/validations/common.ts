import { z } from "zod";

/** Reusable field validators used across multiple forms. */

export const emailField = z.string().email("Enter a valid email address");

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
