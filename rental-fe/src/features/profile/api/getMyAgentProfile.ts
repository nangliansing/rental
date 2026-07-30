import { apiClient } from "@/lib/api-client"

import {
    parseAgentProfileResponse,
    type AgentProfile,
} from "./createAgentProfile"

type GetMyAgentProfileResponse = {
    success: true
    data: AgentProfile
}

export async function getMyAgentProfile(signal?: AbortSignal) {
    const response =
        await apiClient.get<GetMyAgentProfileResponse>("/agent-profiles/me", {
            signal,
        })

    return parseAgentProfileResponse(response.data)
}
