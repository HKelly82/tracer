"use client"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import DashboardHeader from "@/components/dashboard/DashboardHeader"
import WaitingOnLegend from "@/components/dashboard/WaitingOnLegend"
import KanbanBoard from "@/components/dashboard/KanbanBoard"
import NewCaseModal from "@/components/dashboard/NewCaseModal"
import type { CaseSummary } from "@/types"

export default function DashboardPage() {
  const router = useRouter()
  const [cases, setCases] = useState<CaseSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showNewCase, setShowNewCase] = useState(false)
  const [search, setSearch] = useState("")

  const fetchCases = useCallback(async () => {
    const res = await fetch("/api/cases")
    if (res.status === 401) { router.push("/login"); return }
    const data = await res.json()
    setCases(data)
    setLoading(false)
  }, [router])

  useEffect(() => { fetchCases() }, [fetchCases])

  async function handleRefresh() {
    setRefreshing(true)
    await fetchCases()
    setRefreshing(false)
  }

  const filteredCases = search.trim()
    ? cases.filter((c) => c.clientName.toLowerCase().includes(search.toLowerCase()))
    : cases

  return (
    <div className="min-h-screen bg-[var(--color-dashboard-neutral-v2,#EEF1F6)]">
      <div className="max-w-full mx-auto px-4 py-6">
        <DashboardHeader
          cases={cases}
          search={search}
          onSearchChange={setSearch}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          onNewCase={() => setShowNewCase(true)}
        />
        <WaitingOnLegend />

        {loading ? (
          <div className="text-center py-12 text-[#A0AEC0] text-sm">Loading cases…</div>
        ) : (
          <KanbanBoard cases={filteredCases} onRefresh={fetchCases} />
        )}
      </div>

      {showNewCase && (
        <NewCaseModal
          onClose={() => setShowNewCase(false)}
          onCreated={() => { setShowNewCase(false); fetchCases() }}
        />
      )}
    </div>
  )
}
