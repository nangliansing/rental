// src/app/RootLayout.tsx
import { Outlet } from "react-router-dom"

import { AppNavigation } from "@/shared/components/navigation/AppNavigation"
import {
    MAIN_CONTENT_ID,
    SkipToContentLink,
} from "@/shared/components/navigation/SkipToContentLink"
import { RouteAccessibility } from "@/shared/components/navigation/RouteAccessibility"

export function RootLayout() {
    return (
        <>
            <SkipToContentLink />
            <RouteAccessibility />
            <div id={MAIN_CONTENT_ID} tabIndex={-1}>
                <Outlet />
            </div>
            <AppNavigation />
        </>
    )
}
