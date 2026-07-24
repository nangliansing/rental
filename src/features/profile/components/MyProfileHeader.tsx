import { Check, MessageCircle, Phone, Send } from "lucide-react"
import type { ComponentType } from "react"

import type { AuthUser } from "@/features/auth/api"
import { useCopyFeedback } from "@/shared/hooks/useCopyFeedback"

import type { AgentProfile } from "../api"
import { AGENT_CONTACT_DISPLAY_FIELDS } from "../utils/contactFieldDefinitions"
import {
  ProfileAvatar,
  ProfileDetails,
  ProfileIdentity,
} from "./ProfileOverviewPrimitives"

type MyProfileHeaderProps = {
  user: AuthUser | null
  profile: AgentProfile
}

type ContactChip = {
  id: string
  label: string
  value: string
  icon: ComponentType<{ className?: string }>
}

const CONTACT_ICONS = {
  line: Send,
  whatsapp: MessageCircle,
  telegram: Send,
  viber: MessageCircle,
  phone: Phone,
} as const

function buildContactChips(profile: AgentProfile): ContactChip[] {
  return AGENT_CONTACT_DISPLAY_FIELDS.flatMap((contact) => {
    const value = profile[contact.key]

    if (!value) return []

    return [
      {
        id: contact.id,
        label: contact.label,
        value,
        icon: CONTACT_ICONS[contact.id as keyof typeof CONTACT_ICONS] ?? Phone,
      },
    ]
  })
}

export function MyProfileHeader({ user, profile }: MyProfileHeaderProps) {
  const contactChips = buildContactChips(profile)

  return (
    <div className="mx-auto flex max-w-4xl flex-col items-center gap-7 md:mx-0 md:flex-row md:items-start md:gap-10">
      <ProfileAvatar
        displayName={profile.displayName}
        photo={profile.profilePhoto}
        isActive={profile.isOnline}
        statusLabel="Online lister"
      />

      <div className="min-w-0 flex-1 text-center md:text-left">
        <ProfileIdentity
          displayName={profile.displayName}
          isVerified={profile.isVerified}
          secondaryText={user?.email ?? "Contact profile"}
        />

        <div className="mx-auto mt-5 max-w-xl space-y-2 md:mx-0">
          <ProfileDetails
            createdAt={profile.createdAt}
            description={profile.description}
            languages={profile.supportLanguages}
          />
          <ContactChipList contacts={contactChips} />
        </div>
      </div>
    </div>
  )
}

function ContactChipList({ contacts }: { contacts: ContactChip[] }) {
  const { copy, isCopied } = useCopyFeedback()

  if (contacts.length === 0) return null

  return (
    <div className="flex flex-wrap justify-center gap-2 md:justify-start">
      {contacts.map((contact) => (
        <ContactChipButton
          key={contact.id}
          contact={contact}
          isCopied={isCopied(contact.id)}
          onCopy={() => void copy(contact.id, contact.value)}
        />
      ))}
    </div>
  )
}

function ContactChipButton({
  contact,
  isCopied,
  onCopy,
}: {
  contact: ContactChip
  isCopied: boolean
  onCopy: () => void
}) {
  const Icon = isCopied ? Check : contact.icon

  return (
    <button
      type="button"
      className="inline-flex h-9 items-center gap-2 rounded-full bg-slate-100 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-200"
      onClick={onCopy}
    >
      <Icon className="h-4 w-4" />
      {isCopied ? "Copied" : contact.label}
    </button>
  )
}
