#!/usr/bin/env tsx
/**
 * Seed script — creates 3 sample cases at different stages
 * Run with:  npx tsx scripts/seed.ts
 *
 * Cases:
 *   1. Jane Doe       — Research   — OVERDUE (due 3 days ago)
 *   2. John Smith     — DIP        — Due tomorrow
 *   3. Sarah Connor   — AwaitingNB — On track (due in 12 days)
 */

import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { loadEnvConfig } from "@next/env"

loadEnvConfig(process.cwd())

function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

async function main() {
  const connectionString = process.env.DATABASE_URL!
  const adapter = new PrismaPg({ connectionString })
  const prisma = new PrismaClient({ adapter })

  const now = new Date()

  // 1. Overdue research case — due 3 days ago
  const case1 = await prisma.case.upsert({
    where: { id: "seed-case-1" },
    update: {},
    create: {
      id: "seed-case-1",
      clientName: "Jane Doe",
      caseType: "Remortgage",
      stage: "Research",
      stageStartedAt: addDays(now, -5),
      stageDueAt: addDays(now, -3),
      lastActionAt: addDays(now, -5),
    },
  })

  // 2. DIP case — due tomorrow
  const case2 = await prisma.case.upsert({
    where: { id: "seed-case-2" },
    update: {},
    create: {
      id: "seed-case-2",
      clientName: "John Smith",
      caseType: "FTB",
      stage: "DIP",
      stageStartedAt: addDays(now, -1),
      stageDueAt: addDays(now, 1),
      lastActionAt: addDays(now, -1),
      researchCompletedAt: addDays(now, -2),
    },
  })

  // 3. AwaitingNB case — on track, due in 12 days
  const case3 = await prisma.case.upsert({
    where: { id: "seed-case-3" },
    update: {},
    create: {
      id: "seed-case-3",
      clientName: "Sarah Connor",
      caseType: "HomeMover",
      stage: "AwaitingNB",
      stageStartedAt: addDays(now, -8),
      stageDueAt: addDays(now, 12),
      lastActionAt: addDays(now, -2),
      researchCompletedAt: addDays(now, -10),
      dipCompletedAt: addDays(now, -8),
      applicationSubmittedAt: addDays(now, -8),
      nbDueAt: addDays(now, 12),
    },
  })

  // Seed audit log entries
  await prisma.auditLogEvent.createMany({
    data: [
      {
        caseId: case2.id,
        eventType: "StageChanged",
        oldValue: "Research",
        newValue: "ChaseClient",
      },
      {
        caseId: case2.id,
        eventType: "StageChanged",
        oldValue: "ChaseClient",
        newValue: "DIP",
      },
      {
        caseId: case3.id,
        eventType: "StageChanged",
        oldValue: "Research",
        newValue: "ChaseClient",
      },
      {
        caseId: case3.id,
        eventType: "StageChanged",
        oldValue: "ChaseClient",
        newValue: "DIP",
      },
      {
        caseId: case3.id,
        eventType: "StageChanged",
        oldValue: "DIP",
        newValue: "AwaitingNB",
      },
    ],
    skipDuplicates: true,
  })

  console.log("Seeded 3 cases:")
  console.log(`  [OVERDUE]   ${case1.clientName} — ${case1.stage} — due ${case1.stageDueAt.toLocaleDateString("en-GB")}`)
  console.log(`  [DUE SOON]  ${case2.clientName} — ${case2.stage} — due ${case2.stageDueAt.toLocaleDateString("en-GB")}`)
  console.log(`  [ON TRACK]  ${case3.clientName} — ${case3.stage} — due ${case3.stageDueAt.toLocaleDateString("en-GB")}`)

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
