"use client"
import type { Stage } from "@/types"

const STEPS: { stage: Stage; label: string; panelId: string; lockedTip?: string }[] = [
  { stage: "Research",    label: "Research",      panelId: "panel-timer" },
  { stage: "ChaseClient", label: "Chase Client",  panelId: "panel-timer" },
  { stage: "DIP",         label: "DIP",           panelId: "panel-timer" },
  { stage: "AwaitingNB",  label: "Awaiting NB",   panelId: "panel-timer" },
  { stage: "NBSubmitted", label: "Submitted",      panelId: "panel-timer" },
]

const STAGE_ORDER: Stage[] = [
  "Research",
  "ChaseClient",
  "DIP",
  "PostDIPChase",
  "AwaitingNB",
  "NBSubmitted",
  "Completed",
]

type StepState = "completed" | "active" | "future"

function getStepState(stepStage: Stage, currentStage: Stage): StepState {
  const stepIdx = STAGE_ORDER.indexOf(stepStage)
  const currentIdx = STAGE_ORDER.indexOf(currentStage)
  if (stepIdx < currentIdx) return "completed"
  if (stepStage === currentStage) return "active"
  // PostDIPChase is treated as DIP active
  if (currentStage === "PostDIPChase" && stepStage === "DIP") return "active"
  return "future"
}

interface StepIndicatorProps {
  state: StepState
  label: string
  onClick?: () => void
}

function StepIndicator({ state, label, onClick }: StepIndicatorProps) {
  const isClickable = state === "completed" || state === "active"
  return (
    <button
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      className={`flex items-center gap-3 w-full text-left py-1 ${
        isClickable ? "cursor-pointer" : "cursor-default"
      }`}
    >
      <span
        className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm ${
          state === "completed"
            ? "bg-[#38A169] text-white"
            : state === "active"
            ? "bg-[#4A90D9] text-white"
            : "border-2 border-[#E2E8F0] text-[#A0AEC0]"
        }`}
      >
        {state === "completed" ? "✓" : state === "active" ? "●" : "○"}
      </span>
      <span
        className={`text-sm ${
          state === "completed"
            ? "text-[#A0AEC0] line-through"
            : state === "active"
            ? "font-bold text-[#2D3748]"
            : "text-[#A0AEC0]"
        }`}
      >
        {label}
      </span>
    </button>
  )
}

interface CaseProgressStepperProps {
  currentStage: Stage
}

export default function CaseProgressStepper({ currentStage }: CaseProgressStepperProps) {
  function scrollToPanel(panelId: string) {
    const el = document.getElementById(panelId)
    if (el) el.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 sticky top-6">
      <h3 className="text-xs font-medium text-[#A0AEC0] uppercase tracking-wide mb-4">
        Case Progress
      </h3>
      <div className="space-y-1">
        {STEPS.map((step, i) => {
          const state = getStepState(step.stage, currentStage)
          return (
            <div key={step.stage} className="relative">
              {i < STEPS.length - 1 && (
                <div className="absolute left-3.5 top-7 w-0.5 h-full bg-[#E2E8F0] -translate-x-1/2" />
              )}
              <StepIndicator
                state={state}
                label={step.label}
                onClick={() => scrollToPanel(step.panelId)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
