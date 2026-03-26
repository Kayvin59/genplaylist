import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Authentication Error",
  description: "An error occurred during authentication. Please try again.",
}

export default function AuthErrorLayout({ children }: { children: React.ReactNode }) {
  return children
}
