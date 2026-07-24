export function getRouteTitle(pathname: string) {
  if (pathname === "/") return "Search rentals"
  if (pathname === "/login") return "Sign in"
  if (pathname === "/register") return "Create account"
  if (pathname === "/profile") return "Profile"
  if (pathname === "/profile/edit") return "Edit profile"
  if (pathname === "/admin") return "Admin"
  if (pathname === "/listings/new") return "Create listing"
  if (/^\/listings\/[^/]+\/edit$/.test(pathname)) return "Edit listing"
  if (/^\/listings\/[^/]+$/.test(pathname)) return "Listing details"
  if (/^\/buildings\/[^/]+\/edit$/.test(pathname)) {
    return "Edit building"
  }
  if (/^\/listers\/[^/]+$/.test(pathname)) return "Lister profile"

  return "Page"
}
