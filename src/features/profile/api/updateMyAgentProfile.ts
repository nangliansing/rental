import { apiClient } from "@/lib/api-client"

import type {
    AgentProfileFormSubmitValues,
    AgentProfileFormValues,
} from "../components/AgentProfileForm"
import {
    parseAgentProfileResponse,
    type AgentProfile,
} from "./createAgentProfile"

type UpdateMyAgentProfileInput = Partial<AgentProfileFormValues>

type UpdateMyAgentProfileResponse = {
    success: true
    data: AgentProfile
}

export async function updateMyAgentProfile(
    values: AgentProfileFormSubmitValues
) {
    const payload = buildUpdateMyAgentProfilePayload(values)

    const response = await apiClient.patch<UpdateMyAgentProfileResponse>(
        "/agent-profiles/me",
        payload
    )

    return parseAgentProfileResponse(response.data)
}

function setIfProvided<T extends keyof UpdateMyAgentProfileInput>(
    payload: UpdateMyAgentProfileInput,
    values: AgentProfileFormSubmitValues,
    field: T
) {
    if (values[field] !== undefined) {
        payload[field] = values[field] as UpdateMyAgentProfileInput[T]
    }
}

function buildUpdateMyAgentProfilePayload(
    values: AgentProfileFormSubmitValues
): UpdateMyAgentProfileInput {
    const payload: UpdateMyAgentProfileInput = {}

    setIfProvided(payload, values, "displayName")
    setIfProvided(payload, values, "profilePhoto")
    setIfProvided(payload, values, "description")
    setIfProvided(payload, values, "phone")
    setIfProvided(payload, values, "lineUrl")
    setIfProvided(payload, values, "whatsappPhone")
    setIfProvided(payload, values, "telegramUrl")
    setIfProvided(payload, values, "viberPhone")
    setIfProvided(payload, values, "supportLanguages")

    return payload
}
