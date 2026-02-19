#!/usr/bin/env ts-node
/**
 * Generate a bcrypt hash for use as ADMIN_PASSWORD_HASH in .env.local
 *
 * Usage:
 *   npx ts-node scripts/hash-password.ts <plaintext-password>
 *
 * Example:
 *   npx ts-node scripts/hash-password.ts mysecretpassword
 *
 * Copy the printed hash into .env.local as:
 *   ADMIN_PASSWORD_HASH="$2b$12$..."
 */

import bcrypt from "bcryptjs"

const password = process.argv[2]

if (!password) {
  console.error("Error: please provide a password as the first argument.")
  console.error("  Usage: npx ts-node scripts/hash-password.ts <password>")
  process.exit(1)
}

const SALT_ROUNDS = 12

async function main() {
  const hash = await bcrypt.hash(password, SALT_ROUNDS)
  console.log("\nBcrypt hash (copy this into .env.local):\n")
  console.log(`ADMIN_PASSWORD_HASH="${hash}"`)
  console.log()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
