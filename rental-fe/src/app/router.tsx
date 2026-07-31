// src/app/router.tsx
import type { ComponentType } from "react";
import { createBrowserRouter } from "react-router-dom";

import { RouteErrorPage } from "./RouteErrorPage";
import { RootLayout } from "./RootLayout";
import { RouteLoadingFallback } from "./RouteLoadingFallback";
import { StandalonePageLayout } from "./StandalonePageLayout";

function lazyRoute(load: () => Promise<ComponentType>) {
  return async () => ({ Component: await load() });
}

function lazyStandaloneRoute(load: () => Promise<ComponentType>) {
  return lazyRoute(load);
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    HydrateFallback: RouteLoadingFallback,
    children: [
      {
        path: "/",
        lazy: lazyRoute(async () =>
          (await import("@/features/map-search/components/MapSearchPage"))
            .MapSearchPage
        ),
      },
      {
        path: "/profile",
        lazy: lazyRoute(async () =>
          (await import("@/features/profile/pages/ProfilePage")).ProfilePage
        ),
      },
      {
        path: "/admin",
        lazy: lazyRoute(async () =>
          (await import("@/features/admin/pages/AdminPanelPage")).AdminPanelPage
        ),
      },
    ],
  },
  {
    element: <StandalonePageLayout />,
    errorElement: <RouteErrorPage />,
    HydrateFallback: RouteLoadingFallback,
    children: [
      {
        path: "/listers/:agentProfileId",
        lazy: lazyStandaloneRoute(async () =>
          (await import("@/features/agent/pages/ListerProfilePage"))
            .ListerProfilePage
        ),
      },
      {
        path: "/login",
        lazy: lazyStandaloneRoute(async () =>
          (await import("@/features/auth/pages/LoginPage")).LoginPage
        ),
      },
      {
        path: "/register",
        lazy: lazyStandaloneRoute(async () =>
          (await import("@/features/auth/pages/RegisterPage")).RegisterPage
        ),
      },
      {
        path: "/profile/edit",
        lazy: lazyStandaloneRoute(async () =>
          (await import("@/features/profile/pages/ProfileEditPage")).ProfileEditPage
        ),
      },
      {
        path: "/listings/new",
        lazy: lazyStandaloneRoute(async () =>
          (await import("@/features/listing/pages/ListingCreatePage"))
            .ListingCreatePage
        ),
      },
      {
        path: "/buildings/:buildingId",
        lazy: lazyStandaloneRoute(async () =>
          (await import("@/features/buildings/pages/BuildingPage")).BuildingPage
        ),
      },
      {
        path: "/buildings/:buildingId/edit",
        lazy: lazyStandaloneRoute(async () =>
          (await import("@/features/buildings/pages/BuildingEditRequestPage"))
            .BuildingEditRequestPage
        ),
      },
      {
        path: "/listings/:listingId",
        lazy: lazyStandaloneRoute(async () =>
          (await import("@/features/listing/pages/ListingDetailPage"))
            .ListingDetailPage
        ),
      },
      {
        path: "/listings/:listingId/edit",
        lazy: lazyStandaloneRoute(async () =>
          (await import("@/features/listing/pages/ListingEditPage"))
            .ListingEditPage
        ),
      },
    ],
  },
]);
