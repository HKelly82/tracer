// Root redirect to /dashboard — implemented in Slice 1
import { redirect } from "next/navigation"
export default function RootPage() {
  redirect("/dashboard")
}
