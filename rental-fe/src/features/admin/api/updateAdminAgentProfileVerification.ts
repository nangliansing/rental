import { apiClient } from "@/lib/api-client"

import {
  parseAgentProfileResponse,
  type AgentProfile,
} from "@/features/profile/api/createAgentProfile"

export type UpdateAdminAgentProfileVerificationInput = {
  agentProfileId: string
  isVerified: boolean
  reason: string
}

type UpdateAdminAgentProfileVerificationResponse = {
  success: true
  data: AgentProfile
}

function buildUpdateAdminAgentProfileVerificationPayload({
  isVerified,
  reason,
}: UpdateAdminAgentProfileVerificationInput) {
  return {
    isVerified,
    reason: typeof reason === "string" ? reason.trim() : "",
  }
}

export async function updateAdminAgentProfileVerification(
  input: UpdateAdminAgentProfileVerificationInput
) {
  const response =
    await apiClient.patch<UpdateAdminAgentProfileVerificationResponse>(
      `/admin/agent-profiles/${input.agentProfileId}`,
      buildUpdateAdminAgentProfileVerificationPayload(input)
    )

  return parseAgentProfileResponse(response.data)
}
