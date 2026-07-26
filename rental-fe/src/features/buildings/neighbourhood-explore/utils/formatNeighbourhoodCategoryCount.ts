export function formatNeighbourhoodCategoryCount(
  count: number,
  { truncated = false }: { truncated?: boolean } = {},
) {
  return truncated ? `${count}+` : String(count)
}
