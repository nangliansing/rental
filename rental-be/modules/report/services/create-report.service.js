import {
  validateMongooseId,
  validateNullableObject,
} from "../../../shared/validators/index.js";
import { AppError } from "../../../shared/errors/app-error.js";

import Listing from "../../listing/listing.model.js";
import { buildCreateReportRecord } from "../mappers/index.js";
import Report from "../report.model.js";

const isDuplicateOpenReportError = (error) => {
  return error?.code === 11000;
};

export const createReportService = async (body, actorId, session = null) => {
  validateNullableObject(session, "session");

  const reportedBy = validateMongooseId(actorId, "reportedBy");
  const record = buildCreateReportRecord(body, reportedBy);

  let listingQuery = Listing.findOne({
    _id: record.listingId,
    isDeleted: { $ne: true },
  }).select("_id");

  if (session) {
    listingQuery = listingQuery.session(session);
  }

  const listing = await listingQuery;

  if (!listing) {
    throw new AppError("Listing not found", 404, "LISTING_NOT_FOUND");
  }

  try {
    const [report] = await Report.create(
      [record],
      session ? { session } : undefined,
    );

    return report;
  } catch (error) {
    if (isDuplicateOpenReportError(error)) {
      throw new AppError(
        "You already have an open report for this listing",
        409,
        "REPORT_ALREADY_OPEN",
      );
    }

    throw error;
  }
};
