"use client"
import { ButtonHTMLAttributes } from "react"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost"
  size?: "sm" | "md"
}

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center font-medium rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
  }

  const variants = {
    primary: "bg-[#4A90D9] text-white hover:bg-[#3a7bc8] focus:ring-[#4A90D9]",
    secondary: "bg-white text-[#2D3748] border border-[#E2E8F0] hover:bg-gray-50 focus:ring-[#4A90D9]",
    danger: "bg-[#E53E3E] text-white hover:bg-red-700 focus:ring-red-500",
    ghost: "text-[#2D3748] hover:bg-gray-100 focus:ring-[#4A90D9]",
  }

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
