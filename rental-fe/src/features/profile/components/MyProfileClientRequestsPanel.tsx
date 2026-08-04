import { ClientRequestWorkspace } from "@/features/client-request/components/ClientRequestWorkspace"

import { ProfileTabPanel } from "./ProfileTabPanel"

export function MyProfileClientRequestsPanel() {
  return (
    <ProfileTabPanel withSurface={false} className="mt-3">
      <ClientRequestWorkspace />
    </ProfileTabPanel>
  )
}
