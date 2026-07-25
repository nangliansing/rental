import { apiClient } from "@/lib/api-client"

import {
    parseAgentProfileResponse,
    type AgentProfile,
} from "./createAgentProfile"

type DeleteMyAgentProfileResponse = {
    success: true
    data: AgentProfile
}

export async function deleteMyAgentProfile() {
    const response = await apiClient.delete<DeleteMyAgentProfileResponse>(
        "/agent-profiles/me"
    )

    return parseAgentProfileResponse(response.data)
}
