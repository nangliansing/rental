import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type AuthSignInSectionProps = {
  children: ReactNode
  className?: string
}

/** Top-anchored auth layout; avoids vertical recentering when GIS resizes its button. */
export function AuthSignInSection({
  children,
  className,
}: AuthSignInSectionProps) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-md items-start justify-start pt-[clamp(4rem,18vh,8rem)]",
        className,
      )}
    >
      {children}
    </div>
  )
}
