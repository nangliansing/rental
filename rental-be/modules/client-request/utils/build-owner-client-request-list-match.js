export const buildOwnerClientRequestListMatch = ({
  actorId,
  status = null,
}) => {
  const match = {
    createdBy: actorId,
    isDeleted: false,
  };

  if (status) {
    match.status = status;
  }

  return match;
};
