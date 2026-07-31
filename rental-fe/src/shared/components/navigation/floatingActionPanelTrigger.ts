import { cn } from "@/lib/utils"

export function getFloatingActionPanelTriggerClassName(
  variant: "desktop" | "mobile",
  isOpen: boolean,
  className?: string,
) {
  return cn(
    "relative flex items-center justify-center text-slate-600 transition-all duration-200 ease-out hover:text-slate-950 active:scale-95",
    variant === "desktop"
      ? "h-10 w-10 rounded-full hover:bg-slate-100"
      : "flex-col gap-1 text-xs font-medium",
    isOpen && variant === "desktop" && "bg-slate-100 text-slate-950",
    isOpen && variant === "mobile" && "text-slate-950",
    className,
  )
}
