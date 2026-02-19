"use client"

interface FeeComparisonPanelProps {
  totalRepayableFeeAdded: number
  totalRepayableFeeUpfront: number
  interestChargedOnFee: number
}

function fmt(n: number): string {
  return `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function FeeComparisonPanel({
  totalRepayableFeeAdded,
  totalRepayableFeeUpfront,
  interestChargedOnFee,
}: FeeComparisonPanelProps) {
  return (
    <div className="p-4 bg-[#F5F0E8] rounded-lg border border-[#E2E8F0] space-y-3">
      <p className="text-xs font-medium text-[#2D3748] uppercase tracking-wide">
        Fee Disclosure Calculation
      </p>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#A0AEC0]">Total repayable (fee added to loan)</span>
          <span className="font-tabular font-medium text-[#2D3748]">
            {fmt(totalRepayableFeeAdded)}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-[#A0AEC0]">Total repayable (fee paid upfront)</span>
          <span className="font-tabular font-medium text-[#2D3748]">
            {fmt(totalRepayableFeeUpfront)}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm pt-2 border-t border-[#D4C9B0]">
          <span className="text-[#2D3748] font-medium">
            Interest charged on arrangement fee over term
          </span>
          <span className="font-tabular font-semibold text-[#DD6B20]">
            {fmt(interestChargedOnFee)}
          </span>
        </div>
      </div>
    </div>
  )
}
