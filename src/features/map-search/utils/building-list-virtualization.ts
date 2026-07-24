export const BUILDING_LIST_VIRTUALIZATION_THRESHOLD = 30

export function shouldVirtualizeBuildingList(
  buildingCount: number,
  hasScrollRoot: boolean,
) {
  return hasScrollRoot && buildingCount > BUILDING_LIST_VIRTUALIZATION_THRESHOLD
}
