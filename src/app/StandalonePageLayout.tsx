import { Outlet } from "react-router-dom"

import { RouteAccessibility } from "@/shared/components/navigation/RouteAccessibility"
import { StandalonePageBackProvider } from "@/shared/components/navigation/StandalonePageBackContext"
import { StandalonePageHeader } from "@/shared/components/navigation/StandalonePageHeader"
import {
  MAIN_CONTENT_ID,
  SkipToContentLink,
} from "@/shared/components/navigation/SkipToContentLink"

export function StandalonePageLayout() {
  return (
    <StandalonePageBackProvider>
      <SkipToContentLink />
      <RouteAccessibility />
      <StandalonePageHeader />
      <div id={MAIN_CONTENT_ID} tabIndex={-1}>
        <Outlet />
      </div>
    </StandalonePageBackProvider>
  )
}
