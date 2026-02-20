"use client"
import { useState, useRef, useEffect, ReactNode } from "react"

interface CollapsiblePanelProps {
  id?: string
  title: string
  badge?: ReactNode
  defaultOpen?: boolean
  isActive?: boolean
  children: ReactNode
}

export default function CollapsiblePanel({
  id,
  title,
  badge,
  defaultOpen = false,
  isActive = false,
  children,
}: CollapsiblePanelProps) {
  const [open, setOpen] = useState(defaultOpen)
  const contentRef = useRef<HTMLDivElement>(null)

  return (
    <div
      id={id}
      className={`rounded-lg border border-[#E2E8F0] overflow-hidden transition-all duration-200 ${
        isActive ? "border-l-4 border-l-[#4A90D9] bg-white" : "bg-[#FAFAF8]"
      }`}
    >
      {/* Header — always visible */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-[#2D3748] text-sm">{title}</span>
          {badge}
        </div>
        {/* Rotating chevron */}
        <svg
          className={`w-4 h-4 text-[#A0AEC0] transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Animated content area */}
      <div
        className={`transition-all duration-200 overflow-hidden ${
          open ? "opacity-100" : "max-h-0 opacity-0"
        }`}
        style={open ? {} : { maxHeight: 0 }}
      >
        <div ref={contentRef} className="px-4 pb-4">
          {children}
        </div>
      </div>
    </div>
  )
}
