"use client"
import { useEffect, useState, ReactNode } from "react"

interface SuccessPulseProps {
  trigger: boolean
  children: ReactNode
}

export default function SuccessPulse({ trigger, children }: SuccessPulseProps) {
  const [pulsing, setPulsing] = useState(false)

  useEffect(() => {
    if (trigger) {
      setPulsing(true)
      const t = setTimeout(() => setPulsing(false), 700)
      return () => clearTimeout(t)
    }
  }, [trigger])

  return (
    <div className={pulsing ? "success-pulse rounded" : ""}>{children}</div>
  )
}
