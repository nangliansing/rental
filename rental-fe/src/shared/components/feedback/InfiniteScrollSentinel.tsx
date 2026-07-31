// src/shared/components/feedback/InfiniteScrollSentinel.tsx
import { useCallback, useEffect, useRef } from "react"
import type React from "react"
import { Button } from "@/components/ui/button"
import { LoaderIcon } from "@/shared/components/feedback/LoaderIcon"

type InfiniteScrollSentinelProps = {
    hasNextPage: boolean
    isFetchingNextPage: boolean
    isFetchNextPageError?: boolean
    errorMessage?: string
    onFetchNextPage: () => void
    rootRef?: React.RefObject<HTMLElement | null>
    endMessage?: string
}

export function InfiniteScrollSentinel({
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError = false,
    errorMessage = "Could not load more listings.",
    onFetchNextPage,
    rootRef,
    endMessage = "You have reached the end",
}: InfiniteScrollSentinelProps) {
    const sentinelRef = useRef<HTMLDivElement | null>(null)
    const fetchNextPageRef = useRef(onFetchNextPage)
    const isFetchRequestedRef = useRef(false)

    useEffect(() => {
        fetchNextPageRef.current = onFetchNextPage
    }, [onFetchNextPage])

    useEffect(() => {
        if (!isFetchingNextPage) isFetchRequestedRef.current = false
    }, [isFetchingNextPage])

    const requestNextPage = useCallback(() => {
        if (isFetchRequestedRef.current) return
        isFetchRequestedRef.current = true
        fetchNextPageRef.current()
    }, [])

    useEffect(() => {
        const element = sentinelRef.current

        if (!element || !hasNextPage || isFetchingNextPage) return

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) requestNextPage()
            },
            {
                root: rootRef?.current ?? null,
                rootMargin: "160px",
                threshold: 0,
            }
        )

        observer.observe(element)

        return () => {
            observer.disconnect()
        }
    }, [hasNextPage, isFetchingNextPage, requestNextPage, rootRef])

    if (!hasNextPage) {
        return (
            <div className="py-4 text-center text-xs font-medium text-slate-400">
                {endMessage}
            </div>
        )
    }

    if (isFetchNextPageError) {
        return (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
                <p className="text-sm font-medium text-rose-600" role="alert">
                    {errorMessage}
                </p>
                <Button
                    variant="outline"
                    className="h-9 rounded-full px-4 text-sm"
                    onClick={requestNextPage}
                >
                    Try again
                </Button>
            </div>
        )
    }

    return (
        <div ref={sentinelRef} className="flex flex-col items-center py-4">
            {isFetchingNextPage ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                    <LoaderIcon className="h-4 w-4" />
                    Loading more...
                </div>
            ) : (
                <Button
                    variant="ghost"
                    className="h-9 rounded-full px-4 text-sm text-slate-500"
                    onClick={requestNextPage}
                >
                    Load more
                </Button>
            )}
        </div>
    )
}
