export const buildOwnerClientRequestFilter = ({
  clientRequestId,
  actorId,
}) => ({
  _id: clientRequestId,
  createdBy: actorId,
  isDeleted: false,
});
