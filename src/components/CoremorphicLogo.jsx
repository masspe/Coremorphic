import React from "react"

export default function CoremorphicLogo({ className = "h-10 w-10" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 400 400"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Coremorphic logo"
    >
      <defs>
        <linearGradient id="coremorphic-red" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff5a5a" />
          <stop offset="100%" stopColor="#d30f0f" />
        </linearGradient>
        <linearGradient id="coremorphic-blue" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6ad2ff" />
          <stop offset="100%" stopColor="#1071d8" />
        </linearGradient>
      </defs>
      <path
        d="M265 40c-45 0-81 36-81 81v114l114-114c0-45-36-81-81-81z"
        fill="url(#coremorphic-red)"
      />
      <path
        d="M135 360c45 0 81-36 81-81V165L102 279c0 45 36 81 81 81z"
        fill="url(#coremorphic-blue)"
      />
    </svg>
  )
}
