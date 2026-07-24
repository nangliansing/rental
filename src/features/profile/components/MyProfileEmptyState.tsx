import type { ComponentType } from "react"

type MyProfileEmptyStateProps = {
    icon: ComponentType<{ className?: string }>
    title: string
    description: string
}

export function MyProfileEmptyState({
    icon: Icon,
    title,
    description,
}: MyProfileEmptyStateProps) {
    return (
        <div className="mt-8 py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <Icon className="h-7 w-7 text-slate-400" />
            </div>

            <h2 className="mt-4 text-lg font-semibold text-slate-950">
                {title}
            </h2>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                {description}
            </p>
        </div>
    )
}
