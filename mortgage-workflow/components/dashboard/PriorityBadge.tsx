interface PriorityBadgeProps {
  score: number
}

export default function PriorityBadge({ score }: PriorityBadgeProps) {
  if (score < 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-[#E53E3E] font-tabular">
        -{Math.abs(score)}d overdue
      </span>
    )
  }
  if (score <= 1) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-[#DD6B20] font-tabular">
        {score === 0 ? "Today" : "Tomorrow"}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-[#38A169] font-tabular">
      {score}d
    </span>
  )
}
