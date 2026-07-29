import { ApiError, apiClient } from "@/lib/api-client"

import {
    parseAgentProfileResponse,
    type AgentProfile,
} from "./createAgentProfile"

type DeleteMyAgentProfileResponse = {
    success: true
    data: AgentProfile
}

export function isMyAgentProfileNotFoundError(error: unknown) {
    return (
        error instanceof ApiError &&
        (error.code === "AGENT_PROFILE_NOT_FOUND" || error.status === 404)
    )
}

export async function deleteMyAgentProfile() {
    const response = await apiClient.delete<DeleteMyAgentProfileResponse>(
        "/agent-profiles/me"
    )

    return parseAgentProfileResponse(response.data)
}
