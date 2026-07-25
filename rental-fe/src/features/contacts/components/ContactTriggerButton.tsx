import { MessageCircle } from "lucide-react"

import { FOOTER_ICON_PROPS } from "../utils/contactPresentation"
import { FooterIconTriggerButton } from "./FooterIconTriggerButton"

type ContactTriggerButtonProps = {
  contactOwnerName: string
  isOpen: boolean
  onClick: () => void
}

export function ContactTriggerButton({
  contactOwnerName,
  isOpen,
  onClick,
}: ContactTriggerButtonProps) {
  return (
    <FooterIconTriggerButton
      ariaLabel={`Contact ${contactOwnerName}`}
      isOpen={isOpen}
      onClick={onClick}
      icon={<MessageCircle aria-hidden="true" {...FOOTER_ICON_PROPS} />}
    />
  )
}
