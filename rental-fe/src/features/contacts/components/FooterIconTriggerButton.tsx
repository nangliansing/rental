import { FOOTER_ICON_BUTTON_CLASSNAME } from "../utils/contactPresentation"

type FooterIconTriggerButtonProps = {
  ariaLabel: string
  icon: React.ReactNode
  isOpen: boolean
  onClick: () => void
}

export function FooterIconTriggerButton({
  ariaLabel,
  icon,
  isOpen,
  onClick,
}: FooterIconTriggerButtonProps) {
  return (
    <button
      type="button"
      className={FOOTER_ICON_BUTTON_CLASSNAME}
      aria-label={ariaLabel}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      onClick={onClick}
    >
      {icon}
    </button>
  )
}
