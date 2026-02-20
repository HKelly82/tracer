import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error("DATABASE_URL is not set")
  const adapter = new PrismaPg({ connectionString })
  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  })

  // Immutable audit log — block all mutations on AuditLogEvent
  return client.$extends({
    query: {
      auditLogEvent: {
        async $allOperations({ operation, args, query }) {
          const blocked = ["delete", "deleteMany", "update", "updateMany"]
          if (blocked.includes(operation)) {
            throw new Error("AuditLogEvent records are immutable")
          }
          return query(args)
        },
      },
    },
  })
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
