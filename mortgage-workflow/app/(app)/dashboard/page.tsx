"use client"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import CaseTable from "@/components/dashboard/CaseTable"
import type { CaseSummary, CaseType } from "@/types"

const CASE_TYPES: CaseType[] = ["FTB", "HomeMover", "Remortgage", "BTL", "ProductSwitch", "Other"]

export default function DashboardPage() {
  const router = useRouter()
  const [cases, setCases] = useState<CaseSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showNewCase, setShowNewCase] = useState(false)
  const [newClientName, setNewClientName] = useState("")
  const [newCaseType, setNewCaseType] = useState<CaseType>("Remortgage")
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")

  const fetchCases = useCallback(async () => {
    const res = await fetch("/api/cases")
    if (res.status === 401) { router.push("/login"); return }
    const data = await res.json()
    setCases(data)
    setLoading(false)
  }, [router])

  useEffect(() => { fetchCases() }, [fetchCases])

  async function handleCreateCase() {
    if (!newClientName.trim()) { setError("Client name is required"); return }
    setError("")
    setCreating(true)
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName: newClientName.trim(), caseType: newCaseType }),
      })
      if (!res.ok) { setError("Failed to create case"); return }
      setShowNewCase(false)
      setNewClientName("")
      setNewCaseType("Remortgage")
      await fetchCases()
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#E8EDF5]">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#2D3748]">Case Dashboard</h1>
            <p className="text-sm text-[#A0AEC0] mt-0.5">Sorted by priority — overdue first</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                setRefreshing(true)
                await fetchCases()
                setRefreshing(false)
              }}
              disabled={refreshing}
              className="px-3 py-2 text-sm font-medium text-[#4A90D9] border border-[#4A90D9] rounded hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              {refreshing ? "…" : "↻ Refresh"}
            </button>
            <button
              onClick={() => setShowNewCase(true)}
              className="px-4 py-2 text-sm font-medium bg-[#4A90D9] text-white rounded hover:bg-[#3a7bc8] transition-colors"
            >
              + New Case
            </button>
          </div>
        </div>

        {/* Cases table */}
        {loading ? (
          <div className="text-center py-12 text-[#A0AEC0] text-sm">Loading cases…</div>
        ) : (
          <CaseTable cases={cases} onRefresh={fetchCases} />
        )}
      </div>

      {/* New Case modal */}
      {showNewCase && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-bold text-[#2D3748] mb-4">New Case</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#2D3748] mb-1">
                  Client Name <span className="text-[#E53E3E]">*</span>
                </label>
                <input
                  autoFocus
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateCase()}
                  placeholder="e.g. John & Jane Smith"
                  className="w-full border border-[#E2E8F0] rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4A90D9]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2D3748] mb-1">
                  Case Type <span className="text-[#E53E3E]">*</span>
                </label>
                <select
                  value={newCaseType}
                  onChange={(e) => setNewCaseType(e.target.value as CaseType)}
                  className="w-full border border-[#E2E8F0] rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4A90D9]"
                >
                  {CASE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {error && <p className="text-sm text-[#E53E3E]">{error}</p>}
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => { setShowNewCase(false); setError("") }}
                className="px-4 py-2 text-sm font-medium text-[#2D3748] border border-[#E2E8F0] rounded hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={creating}
                onClick={handleCreateCase}
                className="px-4 py-2 text-sm font-medium bg-[#4A90D9] text-white rounded hover:bg-[#3a7bc8] transition-colors disabled:opacity-50"
              >
                {creating ? "Creating…" : "Create Case"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
