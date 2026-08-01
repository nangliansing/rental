import BuildingFollow from "../../building-follow/building-follow.model.js";
import { BUILDING_FOLLOWERS_PAGE_SIZE } from "../building-follow-notify.constants.js";

export async function* paginateBuildingFollowers(
  buildingId,
  { pageSize = BUILDING_FOLLOWERS_PAGE_SIZE, followedBefore = null } = {},
) {
  let page = 1;

  while (true) {
    const match = { buildingId };

    if (followedBefore) {
      match.createdAt = { $lte: followedBefore };
    }

    const followers = await BuildingFollow.find(match)
      .sort({ createdAt: 1, _id: 1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .select("userId createdAt")
      .lean();

    if (followers.length === 0) {
      return;
    }

    yield followers;

    if (followers.length < pageSize) {
      return;
    }

    page += 1;
  }
}
