import { Star } from "lucide-react"

import { cn } from "@/lib/utils"

export function AdminRatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1 text-amber-400">
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          className={cn("h-4 w-4", value <= rating ? "fill-current" : "")}
        />
      ))}
      <span className="ml-1 text-sm font-semibold text-slate-700">
        {rating}.0
      </span>
    </div>
  )
}
