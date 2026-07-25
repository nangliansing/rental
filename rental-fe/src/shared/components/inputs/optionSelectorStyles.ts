export type OptionSelectorActiveColor = "black" | "blue" | "green" | "red"
export type OptionSelectorSize = "small" | "medium" | "large"

export const optionSelectorActiveColorClasses: Record<
  OptionSelectorActiveColor,
  string
> = {
  black: "bg-slate-950 text-white shadow-sm ring-2 ring-slate-200",
  blue: "bg-blue-600 text-white shadow-sm ring-2 ring-blue-100",
  green: "bg-green-600 text-white shadow-sm ring-2 ring-green-100",
  red: "bg-red-600 text-white shadow-sm ring-2 ring-red-100",
}

export const optionSelectorSizeClasses: Record<OptionSelectorSize, string> = {
  small: "min-h-8 px-2.5 py-1.5 text-xs",
  medium: "min-h-9 px-3 py-2 text-sm",
  large: "min-h-10 px-4 py-2.5 text-base",
}
