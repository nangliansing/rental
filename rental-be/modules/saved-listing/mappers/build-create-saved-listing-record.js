const getCoverPhoto = (media = []) => {
  return media.find((item) => item.isCover) ?? media[0] ?? null;
};

export const buildCreateSavedListingRecord = ({
  userId,
  listing,
  building,
}) => {
  return {
    userId,
    listingId: listing._id,
    buildingId: listing.buildingId,
    listedBy: listing.listedBy,
    snapshot: {
      rent: listing.rent,
      visibility: listing.visibility,
      buildingName: building?.name ?? null,
      coverPhoto: getCoverPhoto(listing.media),
    },
  };
};
