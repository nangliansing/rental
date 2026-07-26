import { Check } from "lucide-react"

import { useCopyFeedback } from "@/shared/hooks/useCopyFeedback"

import type { ProfileContactChip } from "../utils/buildProfileContactChips"

type ProfileContactChipsProps = {
  contacts: readonly ProfileContactChip[]
}

export function ProfileContactChips({ contacts }: ProfileContactChipsProps) {
  const { copy, isCopied } = useCopyFeedback()

  if (contacts.length === 0) return null

  return (
    <div className="flex flex-wrap justify-center gap-1.5 md:justify-start">
      {contacts.map((contact) => {
        const copied = isCopied(contact.id)
        const Icon = copied ? Check : contact.icon

        return (
          <button
            key={contact.id}
            type="button"
            className="inline-flex h-7 items-center gap-1 rounded-full bg-slate-100 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-200"
            onClick={() => void copy(contact.id, contact.value)}
          >
            <Icon className="h-3 w-3" aria-hidden="true" />
            {copied ? "Copied" : contact.label}
          </button>
        )
      })}
    </div>
  )
}
