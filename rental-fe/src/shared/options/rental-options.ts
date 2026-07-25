// src/shared/options/rental-options.ts

export type SelectOption<Value extends string | number = string> = {
  label: string
  value: Value
}

export const BUILDING_TYPE_OPTIONS: SelectOption[] = [
  { label: "Apartment", value: "Apartment" },
  { label: "Mansion", value: "Mansion" },
  { label: "Dormitory", value: "Dormitory" },
  { label: "Condo", value: "Condo" },
  { label: "Other", value: "Other" },
]

export const BUILDING_SECURITY_OPTIONS: SelectOption[] = [
  { label: "CCTV", value: "CCTV" },
  { label: "Security guard", value: "Security Guard" },
  { label: "Keycard", value: "Keycard Access" },
  { label: "Access control", value: "Access Control" },
  { label: "Gated entrance", value: "Gated Entrance" },
  { label: "Fire alarm", value: "Fire Alarm" },
  { label: "Smoke detector", value: "Smoke Detector" },
  { label: "Emergency exit", value: "Emergency Exit" },
]

export const BUILDING_FACILITY_OPTIONS: SelectOption[] = [
  { label: "Parking", value: "Parking" },
  { label: "Lift", value: "Lift" },
  // { label: "Wi-Fi", value: "Wifi" },
  { label: "Laundry", value: "Laundry" },
  { label: "Gym", value: "Gym" },
  { label: "Pool", value: "Swimming Pool" },
]

export const KITCHEN_TYPE_OPTIONS: SelectOption[] = [
  { label: "No kitchen", value: "No Kitchen" },
  { label: "Kitchen", value: "Kitchen" },
  { label: "Separate kitchen", value: "Separate Kitchen" },
]

export const LISTING_FACILITY_OPTIONS: SelectOption[] = [
  { label: "Wi-Fi", value: "Wifi" },
  { label: "TV", value: "TV" },
  { label: "Aircon", value: "Air Conditioner" },
  { label: "Fan", value: "Fan" },
  { label: "Fridge", value: "Refrigerator" },
  { label: "Microwave", value: "Microwave" },
  { label: "Washing machine", value: "Washing Machine" },
  { label: "Water heater", value: "Water Heater" },
  { label: "Desk", value: "Desk" },
  { label: "Chair", value: "Chair" },
  { label: "Wardrobe", value: "Wardrobe" },
  { label: "Bed", value: "Bed" },
  { label: "Sofa", value: "Sofa" },
  { label: "Balcony", value: "Balcony" },
  { label: "Private bath", value: "Private Bathroom" },
  { label: "Cooking equipment", value: "Cooking Equipment" },
]

export const SUPPORT_LANGUAGE_OPTIONS: SelectOption[] = [
  { label: "Myanmar", value: "Myanmar" },
  { label: "Thai", value: "Thai" },
  { label: "English", value: "English" },
  { label: "Chinese", value: "Chinese" },
]

export const CONTRACT_MONTH_OPTIONS: SelectOption<number>[] = [
  { label: "1 month", value: 1 },
  { label: "2 months", value: 2 },
  { label: "3 months", value: 3 },
  { label: "6 months", value: 6 },
  { label: "12 months", value: 12 },
]

export const OCCUPANCY_OPTIONS: SelectOption<number>[] = [
  { label: "1 person", value: 1 },
  { label: "2 people", value: 2 },
  { label: "3 people", value: 3 },
  { label: "4 people", value: 4 },
]

export const BEDROOM_COUNT_OPTIONS: SelectOption<number>[] = [
  { label: "Studio", value: 0 },
  { label: "1+ bed", value: 1 },
  { label: "2+ beds", value: 2 },
  { label: "3+ beds", value: 3 },
  { label: "4+ beds", value: 4 },
]

export const BATHROOM_COUNT_OPTIONS: SelectOption<number>[] = [
  { label: "1+ bath", value: 1 },
  { label: "2+ baths", value: 2 },
  { label: "3+ baths", value: 3 },
  { label: "4+ baths", value: 4 },
]