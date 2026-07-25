// modules/search/filters/build-search-agent-filters.js
import { validateSupportLanguages } from "../../agent/agent-profile.validation.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { setArrayIfNotEmpty } from "./helpers/index.js";
import { validateAgentProfileIdFilter } from "./validate-agent-profile-id-filter.js";

export const buildSearchAgentFilters = (body) => {
  const filters = {};

  if (body.supportLanguages !== undefined) {
    setArrayIfNotEmpty(
      filters,
      "supportLanguages",
      validateSupportLanguages(body.supportLanguages)
    );
  }

  if (body.agentProfileIds !== undefined && body.listerIds !== undefined) {
    throw new AppError(
      "Use either agentProfileIds or listerIds, not both",
      422,
      "VALIDATION_ERROR"
    );
  }

  const agentProfileIdsInput = body.agentProfileIds ?? body.listerIds;
  const agentProfileIdsFieldName =
    body.agentProfileIds !== undefined ? "agentProfileIds" : "listerIds";

  if (agentProfileIdsInput !== undefined) {
    setArrayIfNotEmpty(
      filters,
      "agentProfileIds",
      validateAgentProfileIdFilter(
        agentProfileIdsInput,
        agentProfileIdsFieldName
      )
    );
  }

  return filters;
};
