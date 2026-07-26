import type { ComponentType } from "react"
import { Link } from "react-router-dom"

import { PROFILE_TAB_CONTENT_TOP_CLASS } from "../utils/profileLayoutStyles"

type MyProfileEmptyStateAction = {
    label: string
    href: string
}

type MyProfileEmptyStateProps = {
    icon: ComponentType<{ className?: string }>
    title: string
    description: string
    action?: MyProfileEmptyStateAction
}

export function MyProfileEmptyState({
    icon: Icon,
    title,
    description,
    action,
}: MyProfileEmptyStateProps) {
    return (
        <div className={`${PROFILE_TAB_CONTENT_TOP_CLASS} py-16 text-center`}>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <Icon className="h-7 w-7 text-slate-400" />
            </div>

            <h2 className="mt-4 text-lg font-semibold text-slate-950">
                {title}
            </h2>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                {description}
            </p>

            {action && (
                <Link
                    to={action.href}
                    className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white hover:bg-slate-800"
                >
                    {action.label}
                </Link>
            )}
        </div>
    )
}
