import { Loader, type LucideProps } from "lucide-react"

import { cn } from "@/lib/utils"

export function LoaderIcon({ className, ...props }: LucideProps) {
  return <Loader className={cn("animate-spin", className)} {...props} />
}
