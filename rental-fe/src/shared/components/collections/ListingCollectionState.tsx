import { AlertCircle, type LucideIcon } from "lucide-react"

import { LoaderIcon } from "@/shared/components/feedback/LoaderIcon"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { ListingCardGrid } from "./ListingCardGrid"

export function CollectionRefreshStatus({
  label,
  className,
}: {
  label: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-xs font-medium text-slate-500",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <LoaderIcon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </div>
  )
}

type ListingCollectionMessageProps = {
  description?: string
  icon?: LucideIcon
  isLoading?: boolean
  onRetry?: () => void
  title: string
  className?: string
}

export function ListingCollectionMessage({
  description,
  icon: Icon = AlertCircle,
  isLoading = false,
  onRetry,
  title,
  className,
}: ListingCollectionMessageProps) {
  return (
    <div
      className={cn(
        "flex min-h-48 flex-col items-center justify-center px-6 py-10 text-center",
        className,
      )}
      role={isLoading ? "status" : undefined}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        {isLoading ? (
          <LoaderIcon className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Icon className="h-5 w-5" aria-hidden="true" />
        )}
      </span>
      <h3 className="mt-3 text-sm font-semibold text-slate-950">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      )}
      {onRetry && (
        <Button
          type="button"
          variant="outline"
          className="mt-4 h-9 rounded-full px-4"
          onClick={onRetry}
        >
          Try again
        </Button>
      )}
    </div>
  )
}

type ListingCollectionSkeletonProps = {
  className?: string
  columns?: "responsive" | "two"
  count?: number
}

export function ListingCollectionSkeleton({
  className,
  columns = "responsive",
  count = 6,
}: ListingCollectionSkeletonProps) {
  return (
    <div role="status" aria-label="Loading listings" className={className}>
      <ListingCardGrid columns={columns}>
        {Array.from({ length: count }, (_, index) => (
          <div
            key={index}
            className="aspect-square animate-pulse bg-slate-200"
            aria-hidden="true"
          />
        ))}
      </ListingCardGrid>
    </div>
  )
}
