import { defineConfig } from "prisma/config"
import { loadEnvConfig } from "@next/env"

// Load .env.local so DATABASE_URL is available when running prisma CLI commands
loadEnvConfig(process.cwd())

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL!,
  },
})
