"use client"
import { createContext, useContext, useState, ReactNode } from "react"

interface ActivePanelContextValue {
  activePanelId: string | null
  setActivePanelId: (id: string) => void
}

const ActivePanelContext = createContext<ActivePanelContextValue>({
  activePanelId: null,
  setActivePanelId: () => {},
})

export function ActivePanelProvider({ children }: { children: ReactNode }) {
  const [activePanelId, setActivePanelId] = useState<string | null>(null)
  return (
    <ActivePanelContext.Provider value={{ activePanelId, setActivePanelId }}>
      {children}
    </ActivePanelContext.Provider>
  )
}

export function useActivePanel() {
  return useContext(ActivePanelContext)
}
