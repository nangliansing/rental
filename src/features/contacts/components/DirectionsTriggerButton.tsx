import { Send } from "lucide-react"

import { FOOTER_ICON_PROPS } from "../utils/contactPresentation"
import { getDirectionsTriggerLabel } from "../utils/directionsDisplay"
import { FooterIconTriggerButton } from "./FooterIconTriggerButton"

type DirectionsTriggerButtonProps = {
  destinationLabel?: string | null
  isOpen: boolean
  onClick: () => void
}

export function DirectionsTriggerButton({
  destinationLabel,
  isOpen,
  onClick,
}: DirectionsTriggerButtonProps) {
  return (
    <FooterIconTriggerButton
      ariaLabel={getDirectionsTriggerLabel(destinationLabel)}
      isOpen={isOpen}
      onClick={onClick}
      icon={<Send aria-hidden="true" {...FOOTER_ICON_PROPS} />}
    />
  )
}
