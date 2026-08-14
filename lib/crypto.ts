/**
 * lib/crypto.ts — WebAssembly-based bcrypt via hash-wasm.
 *
 * Drop-in replacement for bcryptjs with significantly better performance
 * (WASM vs pure JS) and full Vercel serverless compatibility.
 *
 * API:
 *   import { hashPassword, comparePassword } from "@/lib/crypto";
 *   const hash = await hashPassword("mypassword", 12);
 *   const ok = await comparePassword("mypassword", hash);
 */

import { bcrypt, bcryptVerify } from "hash-wasm";

/**
 * Hash a plaintext password using WebAssembly bcrypt.
 * Generates a cryptographically random 16-byte salt internally.
 *
 * @param password - The plaintext password to hash.
 * @param costFactor - The bcrypt cost factor (default: 12). Range: 4–31.
 * @returns The bcrypt-encoded hash string (e.g. "$2b$12$...").
 */
export async function hashPassword(
  password: string,
  costFactor: number = 12
): Promise<string> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);

  const hash = await bcrypt({
    password: password.normalize("NFKC"),
    salt,
    costFactor,
    outputType: "encoded",
  });

  return hash;
}

/**
 * Verify a plaintext password against a bcrypt hash.
 * Works with hashes produced by bcryptjs, bcrypt, or hash-wasm.
 *
 * @param password - The plaintext password to verify.
 * @param hash - The stored bcrypt hash string.
 * @returns `true` if the password matches, `false` otherwise.
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcryptVerify({
    password: password.normalize("NFKC"),
    hash,
  });
}
