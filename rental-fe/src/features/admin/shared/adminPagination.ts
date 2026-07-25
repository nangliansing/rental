export function getNextAdminPageParam(lastPage: {
  pagination: { page: number; limit: number; total: number }
}) {
  const { page, limit, total } = lastPage.pagination
  const loaded = page * limit

  return loaded < total ? page + 1 : undefined
}
