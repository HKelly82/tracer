import { RefreshCcw, Home, ArrowRightLeft, Key, FileText } from "lucide-react"
import type { CaseType } from "@/types"

const config: Record<CaseType, { icon: typeof Home; label: string }> = {
  Remortgage:    { icon: RefreshCcw,     label: "Remortgage" },
  FTB:           { icon: Home,           label: "FTB" },
  HomeMover:     { icon: Home,           label: "Home Mover" },
  ProductSwitch: { icon: ArrowRightLeft, label: "Product Switch" },
  BTL:           { icon: Key,            label: "BTL" },
  Other:         { icon: FileText,       label: "Other" },
}

export default function CaseTypeBadge({ caseType }: { caseType: CaseType }) {
  const { icon: Icon, label } = config[caseType]
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-[#4A5568]">
      <Icon size={12} />
      {label}
    </span>
  )
}
