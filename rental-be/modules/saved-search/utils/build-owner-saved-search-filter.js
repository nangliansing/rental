export const buildOwnerSavedSearchFilter = ({
  savedSearchId,
  actorId,
}) => ({
  _id: savedSearchId,
  createdBy: actorId,
  isDeleted: false,
});
