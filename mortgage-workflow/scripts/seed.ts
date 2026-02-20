#!/usr/bin/env tsx
/**
 * Seed script — creates sample cases at different stages with v2 fields
 * Run with:  npx tsx scripts/seed.ts
 *
 * Cases:
 *   1. Jane Doe       — Research      — OVERDUE (due 3 days ago) — v1 legacy stage
 *   2. John Smith     — DIP           — Due tomorrow — v1 legacy stage
 *   3. Sarah Connor   — AwaitingNB    — On track (due in 12 days) — v1 legacy stage
 *   4. Mike Johnson   — Lead          — New v2 stage, Eileen referral
 *   5. Lisa Chen      — ClientResponse — New v2 stage, Direct lead
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

  // Clean existing seed data (tasks, notes first due to FK constraints)
  await prisma.task.deleteMany({ where: { caseId: { startsWith: "seed-case-" } } })
  await prisma.note.deleteMany({ where: { caseId: { startsWith: "seed-case-" } } })
  await prisma.auditLogEvent.deleteMany({ where: { caseId: { startsWith: "seed-case-" } } })

  // 1. Overdue research case — v1 legacy stage, Direct lead
  const case1 = await prisma.case.upsert({
    where: { id: "seed-case-1" },
    update: {
      waitingOn: "Me",
      leadSource: "Direct",
      clientSummary: "Returning client, remortgage due April 2026. Currently with Nationwide at 3.89% SVR. Looking for best 5yr fix.",
    },
    create: {
      id: "seed-case-1",
      clientName: "Jane Doe",
      caseType: "Remortgage",
      stage: "Research",
      stageStartedAt: addDays(now, -5),
      stageDueAt: addDays(now, -3),
      lastActionAt: addDays(now, -5),
      waitingOn: "Me",
      leadSource: "Direct",
      clientSummary: "Returning client, remortgage due April 2026. Currently with Nationwide at 3.89% SVR. Looking for best 5yr fix.",
    },
  })

  // 2. DIP case — v1 legacy stage, Eileen referral
  const case2 = await prisma.case.upsert({
    where: { id: "seed-case-2" },
    update: {
      waitingOn: "Client",
      leadSource: "Eileen",
      clientSummary: "FTB couple, combined income £62k. Looking at Barking area, budget £350k. Deposit £35k from savings. Both employed, no adverse credit. Prefer 2yr fix for flexibility.",
      feeArrangement: "£200 advice + £150 admin",
    },
    create: {
      id: "seed-case-2",
      clientName: "John Smith",
      caseType: "FTB",
      stage: "DIP",
      stageStartedAt: addDays(now, -1),
      stageDueAt: addDays(now, 1),
      lastActionAt: addDays(now, -1),
      researchCompletedAt: addDays(now, -2),
      sharedCase: true,
      waitingOn: "Client",
      leadSource: "Eileen",
      clientSummary: "FTB couple, combined income £62k. Looking at Barking area, budget £350k. Deposit £35k from savings. Both employed, no adverse credit. Prefer 2yr fix for flexibility.",
      feeArrangement: "£200 advice + £150 admin",
    },
  })

  // 3. AwaitingNB case — v1 legacy stage
  const case3 = await prisma.case.upsert({
    where: { id: "seed-case-3" },
    update: {
      waitingOn: "Lender",
      leadSource: "Eileen",
    },
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
      sharedCase: true,
      waitingOn: "Lender",
      leadSource: "Eileen",
      feeArrangement: "£200 advice (admin fee waived — police)",
    },
  })

  // 4. New Lead case — v2 stage, Eileen referral
  const case4 = await prisma.case.upsert({
    where: { id: "seed-case-4" },
    update: {
      waitingOn: "Me",
      leadSource: "Eileen",
      clientSummary: "Hi Helen,\n\nNew enquiry from David & Emma Williams. They are looking to remortgage their property at 14 Oak Lane, Chelmsford CM1 2AB. Property valued at £425,000 on Zoopla. Current mortgage with Halifax, £280,000 outstanding, 2yr fix at 4.19% expiring June 2026. David is a police sergeant earning £48,500, Emma is a teaching assistant earning £22,000. No other debts. They would like to fix again for 5 years.\n\nI have sent Client Agreement and Authority.\n\nRegards,\nEileen",
    },
    create: {
      id: "seed-case-4",
      clientName: "David & Emma Williams",
      caseType: "Remortgage",
      stage: "Lead",
      stageStartedAt: now,
      stageDueAt: addDays(now, 2),
      lastActionAt: now,
      waitingOn: "Me",
      leadSource: "Eileen",
      clientSummary: "Hi Helen,\n\nNew enquiry from David & Emma Williams. They are looking to remortgage their property at 14 Oak Lane, Chelmsford CM1 2AB. Property valued at £425,000 on Zoopla. Current mortgage with Halifax, £280,000 outstanding, 2yr fix at 4.19% expiring June 2026. David is a police sergeant earning £48,500, Emma is a teaching assistant earning £22,000. No other debts. They would like to fix again for 5 years.\n\nI have sent Client Agreement and Authority.\n\nRegards,\nEileen",
      sharedCase: true,
      feeArrangement: "£200 advice + £150 admin",
    },
  })

  // 5. ClientResponse case — v2 stage, Direct lead
  const case5 = await prisma.case.upsert({
    where: { id: "seed-case-5" },
    update: {
      waitingOn: "Client",
      leadSource: "Direct",
      clientSummary: "Returning client, product switch from Santander SVR. Sent options email with 3 products on 18 Feb. Awaiting confirmation of preference.",
    },
    create: {
      id: "seed-case-5",
      clientName: "Lisa Chen",
      caseType: "ProductSwitch",
      stage: "ClientResponse",
      stageStartedAt: addDays(now, -2),
      stageDueAt: addDays(now, 3),
      lastActionAt: addDays(now, -2),
      researchCompletedAt: addDays(now, -3),
      waitingOn: "Client",
      leadSource: "Direct",
      clientSummary: "Returning client, product switch from Santander SVR. Sent options email with 3 products on 18 Feb. Awaiting confirmation of preference.",
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

  // Seed sample tasks
  await prisma.task.createMany({
    data: [
      // Case 1 — Research tasks
      {
        caseId: case1.id,
        title: "Complete initial research (Sourcing Brain)",
        status: "InProgress",
        waitingOn: "Me",
        sortOrder: 0,
      },
      {
        caseId: case1.id,
        title: "Send initial options email",
        status: "Pending",
        waitingOn: "Me",
        sortOrder: 1,
      },
      // Case 2 — DIP tasks
      {
        caseId: case2.id,
        title: "DIP readiness check",
        status: "InProgress",
        waitingOn: "Client",
        sortOrder: 0,
        notes: "Waiting for March payslips from both applicants",
      },
      {
        caseId: case2.id,
        title: "Submit application on lender portal",
        status: "Pending",
        waitingOn: "Me",
        sortOrder: 1,
      },
      {
        caseId: case2.id,
        title: "Record application date",
        status: "Pending",
        waitingOn: "Me",
        sortOrder: 2,
      },
      // Case 3 — AwaitingNB tasks
      {
        caseId: case3.id,
        title: "Generate Suitability Letter",
        status: "Complete",
        waitingOn: "Me",
        sortOrder: 0,
        completedAt: addDays(now, -3),
      },
      {
        caseId: case3.id,
        title: "Generate ASF",
        status: "Complete",
        waitingOn: "Me",
        sortOrder: 1,
        completedAt: addDays(now, -3),
      },
      {
        caseId: case3.id,
        title: "Submit pack to NB",
        status: "InProgress",
        waitingOn: "Me",
        sortOrder: 2,
      },
      // Case 4 — Lead tasks
      {
        caseId: case4.id,
        title: "Contact client",
        status: "Pending",
        waitingOn: "Me",
        sortOrder: 0,
      },
      {
        caseId: case4.id,
        title: "Send Client Agreement + Authority",
        status: "Pending",
        waitingOn: "Me",
        sortOrder: 1,
        notes: "Eileen has already sent — confirm receipt",
      },
      {
        caseId: case4.id,
        title: "Set up on IO",
        status: "Pending",
        waitingOn: "Me",
        sortOrder: 2,
      },
      // Case 5 — ClientResponse tasks
      {
        caseId: case5.id,
        title: "Client confirms preferences",
        status: "Pending",
        waitingOn: "Client",
        sortOrder: 0,
        dueDate: addDays(now, 3),
      },
      {
        caseId: case5.id,
        title: "Gather outstanding documents",
        status: "Pending",
        waitingOn: "Client",
        sortOrder: 1,
      },
    ],
  })

  // Seed sample notes
  await prisma.note.createMany({
    data: [
      {
        caseId: case1.id,
        content: "Jane called — prefers 5yr fix, wants to keep monthly payments under £900. Check Nationwide loyalty rates.",
        createdAt: addDays(now, -4),
      },
      {
        caseId: case2.id,
        content: "Eileen confirmed both applicants have sent ID docs. CVI booked for tomorrow.",
        createdAt: addDays(now, -1),
      },
      {
        caseId: case2.id,
        content: "John called — concerned about stamp duty. Explained FTB relief applies under £425k threshold.",
        createdAt: addDays(now, -3),
      },
      {
        caseId: case3.id,
        content: "SL and ASF generated. Gathering final documents for NB pack.",
        createdAt: addDays(now, -3),
      },
      {
        caseId: case4.id,
        content: "Eileen's referral email received. Good detail — property value, income, current deal all provided.",
        createdAt: now,
      },
      {
        caseId: case5.id,
        content: "Sent 3 options: Santander 2yr fix 4.09%, Halifax 5yr fix 4.29%, Nationwide 2yr fix 3.99%. Lisa prefers the Nationwide rate but wants to discuss term.",
        createdAt: addDays(now, -2),
      },
    ],
  })

  console.log("Seeded 5 cases:")
  console.log(`  [OVERDUE]        ${case1.clientName} — ${case1.stage} — due ${case1.stageDueAt.toLocaleDateString("en-GB")} — waitingOn: ${case1.waitingOn}`)
  console.log(`  [DUE SOON]       ${case2.clientName} — ${case2.stage} — due ${case2.stageDueAt.toLocaleDateString("en-GB")} — waitingOn: ${case2.waitingOn}`)
  console.log(`  [ON TRACK]       ${case3.clientName} — ${case3.stage} — due ${case3.stageDueAt.toLocaleDateString("en-GB")} — waitingOn: ${case3.waitingOn}`)
  console.log(`  [NEW LEAD]       ${case4.clientName} — ${case4.stage} — due ${case4.stageDueAt.toLocaleDateString("en-GB")} — waitingOn: ${case4.waitingOn}`)
  console.log(`  [CLIENT REPLY]   ${case5.clientName} — ${case5.stage} — due ${case5.stageDueAt.toLocaleDateString("en-GB")} — waitingOn: ${case5.waitingOn}`)

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
