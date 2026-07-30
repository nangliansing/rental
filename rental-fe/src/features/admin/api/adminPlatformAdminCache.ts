import type { InfiniteData } from "@tanstack/react-query"

import { removeFromInfiniteList } from "@/lib/query-state"
import {
  isInfiniteListCollection,
  type QueryStateMatcher,
  type QueryStateRecord,
} from "@/lib/query-state/shared"

import type { SearchAdminPlatformAdminsResponse } from "./searchAdminPlatformAdmins"

export type AdminPlatformAdminsInfiniteData = InfiniteData<
  SearchAdminPlatformAdminsResponse
>

const isPlatformAdminId =
  (userId: string): QueryStateMatcher<QueryStateRecord> =>
  (admin) =>
    admin._id === userId

export function removePlatformAdminFromInfiniteData(
  current: AdminPlatformAdminsInfiniteData | undefined,
  userId: string,
) {
  if (current === undefined) return current
  if (!isInfiniteListCollection(current)) return current

  const result = removeFromInfiniteList(current, isPlatformAdminId(userId))
  return result as AdminPlatformAdminsInfiniteData | undefined
}
