"use client"
import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { ActivePanelProvider, useActivePanel } from "@/components/case/ActivePanelContext"
import CaseProgressStepper from "@/components/case/CaseProgressStepper"
import StageHeader from "@/components/case/StageHeader"
import TimerPanel from "@/components/case/TimerPanel"
import CollapsiblePanel from "@/components/ui/CollapsiblePanel"
import LockedPanelState from "@/components/case/LockedPanelState"
import StatusBadge from "@/components/ui/StatusBadge"
import IllustrationPanel from "@/components/case/IllustrationPanel"
import FeeComparisonPanel from "@/components/case/FeeComparisonPanel"
import SuitabilityPanel from "@/components/case/SuitabilityPanel"
import ASFPanel from "@/components/case/ASFPanel"
import OfferPanel from "@/components/case/OfferPanel"
import AuditSummary from "@/components/case/AuditSummary"
import type { Stage } from "@/types"

interface IllustrationRecord {
  id: string
  documentId: string
  variant: string
  lenderName: string
  loanAmount: string | number
  totalAmountRepayable: string | number
  arrangementFeeAddedToLoan: boolean
  confirmed: boolean
  portability: boolean
  overpaymentPercent: number | null
  initialRatePercent: string | number
  termYears: number
}

interface FeeDisclosure {
  totalRepayableFeeAdded: number
  totalRepayableFeeUpfront: number
  interestChargedOnFee: number
}

interface SuitabilityDraftRecord {
  id: string
  objectiveCategory: string
  objectiveNotes: string | null
  justificationMode: string
  presetJustificationKey: string | null
  manualJustificationText: string | null
  affordabilitySummary: string
  riskSummary: string
  includePortabilitySection: boolean
  includeOverpaymentSection: boolean
  includeAlternativeProducts: boolean
  staleDueToInputChange: boolean
  approvedByUser: boolean
}

interface ASFDraftRecord {
  id: string
  vulnerableClient: boolean
  sourceOfBusiness: string | null
  purposeOfLoan: string | null
  borrowerType: string | null
  accountNumber: string | null
  approvedByUser: boolean
}

interface CommissionRecord {
  id: string
  helenSplitPercent: string | number
  eileenSplitPercent: string | number
  splitRuleApplied: string
  feeWaived: boolean
}

interface OfferRecord {
  id: string
  confirmedRatePercent: string | number
  confirmedLoanAmount: string | number
  confirmedTermYears: number
  matchesIllustration: boolean
  mismatchFields: string[]
  acknowledgedByUser: boolean
}

interface CaseData {
  id: string
  clientName: string
  stage: Stage
  stageVariant: string | null
  stageStartedAt: string
  stageDueAt: string
  illustrations: IllustrationRecord[]
  feeDisclosure: FeeDisclosure | null
  suitabilityDraft: SuitabilityDraftRecord | null
  asfDraft: ASFDraftRecord | null
  commission: CommissionRecord | null
  offer: OfferRecord | null
  lateNbSubmission: boolean
  auditLog: { id: string; eventType: string; createdAt: string; fieldKey?: string | null; oldValue: string | null; newValue: string | null; reason: string | null }[]
}

function isSuitabilityEnabled(
  illustrations: CaseData["illustrations"],
  feeDisclosure: CaseData["feeDisclosure"]
): boolean {
  const primary = illustrations.find((i) => i.variant === "None" || i.variant === "FeeAdded")
  if (!primary?.confirmed) return false
  if (primary.arrangementFeeAddedToLoan) {
    const feeUpfront = illustrations.find((i) => i.variant === "FeeUpfront")
    if (!feeUpfront?.confirmed) return false
    return !!feeDisclosure
  }
  return true
}

function getSuitabilityLockMessage(illustrations: CaseData["illustrations"]): string {
  const primary = illustrations.find((i) => i.variant === "None" || i.variant === "FeeAdded")
  if (primary?.arrangementFeeAddedToLoan) {
    return "Upload and confirm both illustrations to unlock"
  }
  return "Confirm Illustration data to unlock"
}

function CaseViewInner({ caseId }: { caseId: string }) {
  const router = useRouter()
  const [data, setData] = useState<CaseData | null>(null)
  const [loading, setLoading] = useState(true)
  const { activePanelId, setActivePanelId } = useActivePanel()

  const fetchCase = useCallback(async () => {
    const res = await fetch(`/api/cases/${caseId}`)
    if (res.status === 401) { router.push("/login"); return }
    if (res.status === 404) { router.push("/dashboard"); return }
    const json = await res.json()
    setData(json)
    setLoading(false)
  }, [caseId, router])

  useEffect(() => { fetchCase() }, [fetchCase])

  // Auto-trigger fee calculation once both illustrations are confirmed
  useEffect(() => {
    if (!data) return
    const primary = data.illustrations.find(
      (i) => i.variant === "None" || i.variant === "FeeAdded"
    )
    const feeUpfront = data.illustrations.find((i) => i.variant === "FeeUpfront")
    if (
      primary?.arrangementFeeAddedToLoan &&
      primary.confirmed &&
      feeUpfront?.confirmed &&
      !data.feeDisclosure
    ) {
      fetch(`/api/cases/${data.id}/fee-calculation`, { method: "POST" })
        .then(() => fetchCase())
        .catch(console.error)
    }
  }, [data, fetchCase])

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#E8EDF5] flex items-center justify-center">
        <p className="text-sm text-[#A0AEC0]">Loading case…</p>
      </div>
    )
  }

  const suitabilityEnabled = isSuitabilityEnabled(data.illustrations, data.feeDisclosure)
  const lockMessage = getSuitabilityLockMessage(data.illustrations)

  function panelInteractionProps(panelId: string) {
    return {
      onClick: () => setActivePanelId(panelId),
      onFocus: () => setActivePanelId(panelId),
    }
  }

  const isTimerActive = activePanelId === "timer"
  const isIllustrationActive = activePanelId === "illustration"
  const isOfferActive = activePanelId === "offer"
  const isSuitabilityActive = activePanelId === "suitability"
  const isAsfActive = activePanelId === "asf"
  const isAuditActive = activePanelId === "audit"

  const primary = data.illustrations.find(
    (i) => i.variant === "None" || i.variant === "FeeAdded"
  )
  const feeUpfront = data.illustrations.find((i) => i.variant === "FeeUpfront")
  const hasFeeScenario = primary?.arrangementFeeAddedToLoan === true

  return (
    <div className="min-h-screen bg-[#E8EDF5]">
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Breadcrumb */}
        <nav className="mb-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm text-[#4A90D9] hover:underline"
          >
            ← Dashboard
          </button>
        </nav>

        {/* Stage Header — always visible */}
        <StageHeader
          caseId={data.id}
          clientName={data.clientName}
          stage={data.stage}
          stageVariant={data.stageVariant}
          stageDueAt={data.stageDueAt}
          onRefresh={fetchCase}
        />
        {data.lateNbSubmission && (
          <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 border border-amber-300 text-amber-800 text-xs font-medium rounded">
            ⚠ Submitted Late
          </div>
        )}

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6 mt-4">

          {/* Left column: panel stack */}
          <div className="space-y-3">

            {/* Timer Panel */}
            <div {...panelInteractionProps("timer")}>
              <CollapsiblePanel
                id="panel-timer"
                title="Stage Timer"
                defaultOpen={true}
                isActive={isTimerActive}
                badge={<StatusBadge stage={data.stage} />}
              >
                <TimerPanel
                  caseId={data.id}
                  stage={data.stage}
                  stageStartedAt={data.stageStartedAt}
                  stageDueAt={data.stageDueAt}
                  onRefresh={fetchCase}
                />
              </CollapsiblePanel>
            </div>

            {/* Illustration Panel */}
            <div {...panelInteractionProps("illustration")}>
              <CollapsiblePanel
                id="panel-illustration"
                title="Mortgage Illustration"
                defaultOpen={true}
                isActive={isIllustrationActive}
              >
                <div className="space-y-4">
                  <IllustrationPanel
                    caseId={data.id}
                    existingIllustration={primary ?? null}
                    label={hasFeeScenario ? "Illustration A — Fee Added" : "Mortgage Illustration"}
                    onUploaded={fetchCase}
                  />

                  {hasFeeScenario && (
                    <IllustrationPanel
                      caseId={data.id}
                      variant="FeeUpfront"
                      existingIllustration={feeUpfront ?? null}
                      label="Illustration B — Fee Upfront"
                      onUploaded={fetchCase}
                    />
                  )}

                  {/* Fee comparison — visible once both confirmed and calculation ready */}
                  {hasFeeScenario && data.feeDisclosure && (
                    <FeeComparisonPanel
                      totalRepayableFeeAdded={Number(data.feeDisclosure.totalRepayableFeeAdded)}
                      totalRepayableFeeUpfront={Number(data.feeDisclosure.totalRepayableFeeUpfront)}
                      interestChargedOnFee={Number(data.feeDisclosure.interestChargedOnFee)}
                    />
                  )}
                </div>
              </CollapsiblePanel>
            </div>

            {/* Offer Panel */}
            <div {...panelInteractionProps("offer")}>
              <CollapsiblePanel
                id="panel-offer"
                title="Mortgage Offer"
                defaultOpen={false}
                isActive={isOfferActive}
              >
                <OfferPanel
                  caseId={data.id}
                  existingOffer={data.offer}
                  primaryIllustration={primary ?? null}
                  onRefresh={fetchCase}
                />
              </CollapsiblePanel>
            </div>

            {/* Suitability Panel */}
            <div {...panelInteractionProps("suitability")}>
              <CollapsiblePanel
                id="panel-suitability"
                title="Suitability Letter"
                defaultOpen={false}
                isActive={isSuitabilityActive}
              >
                {suitabilityEnabled ? (
                  <SuitabilityPanel
                    caseId={data.id}
                    clientName={data.clientName}
                    existingDraft={data.suitabilityDraft}
                    illustrationSnapshot={primary ?? null}
                    onRefresh={fetchCase}
                  />
                ) : (
                  <LockedPanelState message={lockMessage} />
                )}
              </CollapsiblePanel>
            </div>

            {/* ASF Panel */}
            <div {...panelInteractionProps("asf")}>
              <CollapsiblePanel
                id="panel-asf"
                title="ASF"
                defaultOpen={false}
                isActive={isAsfActive}
              >
                {suitabilityEnabled ? (
                  <ASFPanel
                    caseId={data.id}
                    clientName={data.clientName}
                    existingDraft={data.asfDraft}
                    existingCommission={data.commission}
                    onRefresh={fetchCase}
                  />
                ) : (
                  <LockedPanelState message={lockMessage} />
                )}
              </CollapsiblePanel>
            </div>

            {/* Audit Summary */}
            <div {...panelInteractionProps("audit")}>
              <CollapsiblePanel
                id="panel-audit"
                title="Audit Log"
                defaultOpen={false}
                isActive={isAuditActive}
              >
                <AuditSummary events={data.auditLog} />
              </CollapsiblePanel>
            </div>
          </div>

          {/* Right column: sticky stepper */}
          <div className="hidden lg:block">
            <CaseProgressStepper currentStage={data.stage} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CasePage() {
  const params = useParams()
  const id = params.id as string

  return (
    <ActivePanelProvider>
      <CaseViewInner caseId={id} />
    </ActivePanelProvider>
  )
}
