type UserMenuFollowedBuildingsEmptyProps = {
  className?: string
}

export function UserMenuFollowedBuildingsEmpty({
  className,
}: UserMenuFollowedBuildingsEmptyProps) {
  return (
    <p className={className ?? "mt-3 text-sm font-medium text-slate-500"}>
      Follow buildings from map search to see them here.
    </p>
  )
}
