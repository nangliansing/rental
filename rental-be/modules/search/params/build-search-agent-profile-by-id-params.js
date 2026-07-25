// modules/search/params/build-search-agent-profile-by-id-params.js
import {
    validateMongooseId,
    validateObject,
} from "../../../shared/validators/index.js";

export const buildSearchAgentProfileByIdParams = (paramsInput) => {
    validateObject(paramsInput, "params");

    return {
        agentProfileId: validateMongooseId(
            paramsInput.agentProfileId,
            "agentProfileId",
            { asObjectId: true }
        ),
    };
};
