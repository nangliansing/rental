import { MapPin } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import { AdminChipList } from "./AdminChipList"
import { AdminInfoRow } from "./AdminInfoRow"

export type AdminBuildingSummary = {
  name: string
  buildingType: string
  address?: string | null
  location?: {
    coordinates: [number, number]
  } | null
  facilities?: string[]
  security?: string[]
  isActive?: boolean
}

function formatCoordinates(location: AdminBuildingSummary["location"]) {
  if (!location) return null

  return `${location.coordinates[1].toFixed(6)}, ${location.coordinates[0].toFixed(6)}`
}

export function AdminBuildingCard({
  building,
  compareTo,
  showActive = false,
}: {
  building: AdminBuildingSummary
  compareTo?: AdminBuildingSummary
  showActive?: boolean
}) {
  const coordinates = formatCoordinates(building.location)
  const comparedCoordinates = formatCoordinates(compareTo?.location)
  const isNameChanged = compareTo ? building.name !== compareTo.name : false
  const isTypeChanged = compareTo
    ? building.buildingType !== compareTo.buildingType
    : false
  const isAddressChanged = compareTo
    ? (building.address || "") !== (compareTo.address || "")
    : false
  const isLocationChanged = compareTo
    ? coordinates !== comparedCoordinates
    : false
  const isFacilitiesChanged = compareTo
    ? (building.facilities ?? []).join(",") !==
      (compareTo.facilities ?? []).join(",")
    : false
  const isSecurityChanged = compareTo
    ? (building.security ?? []).join(",") !== (compareTo.security ?? []).join(",")
    : false

  return (
    <>
      <ComparedRow isChanged={isNameChanged}>
        <AdminInfoRow label="Name" value={building.name} />
      </ComparedRow>
      <ComparedRow isChanged={isTypeChanged}>
        <AdminInfoRow label="Type" value={building.buildingType} />
      </ComparedRow>
      <ComparedRow isChanged={isAddressChanged}>
        <AdminInfoRow label="Address" value={building.address || "No address"} />
      </ComparedRow>
      {coordinates && (
        <ComparedRow isChanged={isLocationChanged}>
          <AdminInfoRow
            label="Coordinates"
            value={coordinates}
            icon={<MapPin className="h-4 w-4" />}
          />
        </ComparedRow>
      )}
      {showActive && building.isActive != null && (
        <AdminInfoRow label="Active" value={building.isActive ? "Yes" : "No"} />
      )}
      <ComparedRow isChanged={isFacilitiesChanged}>
        <AdminChipList label="Facilities" values={building.facilities ?? []} />
      </ComparedRow>
      <ComparedRow isChanged={isSecurityChanged}>
        <AdminChipList label="Security" values={building.security ?? []} />
      </ComparedRow>
    </>
  )
}

function ComparedRow({
  isChanged,
  children,
}: {
  isChanged: boolean
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        "rounded-lg",
        isChanged && "bg-blue-50 p-2 ring-1 ring-blue-100",
      )}
    >
      {children}
      {isChanged && (
        <p className="mt-1 text-xs font-semibold text-blue-700">Changed</p>
      )}
    </div>
  )
}
