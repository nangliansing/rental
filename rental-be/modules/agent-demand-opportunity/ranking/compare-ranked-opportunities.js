const timestamp = (value) => {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

export const compareRankedOpportunities = (left, right) => {
  const scoreDifference =
    (right.opportunityRanking?.score ?? -1) -
    (left.opportunityRanking?.score ?? -1);
  if (scoreDifference !== 0) return scoreDifference;

  const freshnessDifference =
    timestamp(right.lastConfirmedAt ?? right.createdAt) -
    timestamp(left.lastConfirmedAt ?? left.createdAt);
  if (freshnessDifference !== 0) return freshnessDifference;

  const creationDifference = timestamp(right.createdAt) - timestamp(left.createdAt);
  if (creationDifference !== 0) return creationDifference;
  return String(left._id).localeCompare(String(right._id));
};
