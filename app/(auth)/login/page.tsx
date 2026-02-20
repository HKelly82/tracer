"use client"
import { useState, FormEvent } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      })
      if (result?.error) {
        setError("Invalid username or password.")
      } else {
        router.push("/dashboard")
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo / title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[#2D3748]">Mortgage Workflow</h1>
          <p className="text-sm text-[#A0AEC0] mt-1">Sign in to continue</p>
        </div>

        {/* Card — border only, no shadow */}
        <div className="border border-[#E2E8F0] rounded-lg p-6 bg-white">
          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-[#2D3748] mb-1">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                inputMode="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="helen"
                className="w-full border border-[#E2E8F0] rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4A90D9]"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#2D3748] mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-[#E2E8F0] rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#4A90D9]"
              />
            </div>

            {error && (
              <p className="text-sm text-[#E53E3E]">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#4A90D9] text-white py-2 px-4 rounded text-sm font-medium hover:bg-[#3a7bc8] transition-colors disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
