import {
  Ban,
  Languages,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Send,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"

import type { UploadedMedia } from "@/features/uploads"

import { AdminChipList } from "./AdminChipList"
import {
  AdminContactRow,
  type AdminContactRowProps,
} from "./AdminContactRow"
import { AdminUserCard } from "./AdminUserCard"

export type AdminListerCardProfile = {
  displayName?: string | null
  profilePhoto?: UploadedMedia | null
  phone?: string | null
  lineUrl?: string | null
  whatsappPhone?: string | null
  telegramUrl?: string | null
  viberPhone?: string | null
  supportLanguages?: string[]
  isOnline?: boolean
  isVerified?: boolean
}

function buildContactRows(profile?: AdminListerCardProfile | null) {
  const contactRows: AdminContactRowProps[] = []

  if (profile?.lineUrl) {
    contactRows.push({
      label: "Line",
      value: profile.lineUrl,
      href: profile.lineUrl,
      icon: <Send className="h-4 w-4" />,
    })
  }

  if (profile?.whatsappPhone) {
    contactRows.push({
      label: "WhatsApp",
      value: profile.whatsappPhone,
      href: `https://wa.me/${profile.whatsappPhone.replace(/\D/g, "")}`,
      icon: <MessageCircle className="h-4 w-4" />,
    })
  }

  if (profile?.telegramUrl) {
    contactRows.push({
      label: "Telegram",
      value: profile.telegramUrl,
      href: profile.telegramUrl,
      icon: <Send className="h-4 w-4" />,
    })
  }

  if (profile?.viberPhone) {
    contactRows.push({
      label: "Viber",
      value: profile.viberPhone,
      icon: <MessageCircle className="h-4 w-4" />,
    })
  }

  if (profile?.phone) {
    contactRows.push({
      label: "Phone",
      value: profile.phone,
      href: `tel:${profile.phone}`,
      icon: <Phone className="h-4 w-4" />,
    })
  }

  return contactRows
}

export function AdminListerCard({
  name,
  subtitle,
  meta,
  profile,
  showContacts = true,
  suspendTarget,
  onSuspend,
}: {
  name: string
  subtitle?: string
  meta?: string
  profile?: AdminListerCardProfile | null
  showContacts?: boolean
  suspendTarget?: {
    userId: string
    isSuspended: boolean
  }
  onSuspend?: (target: { userId: string; name: string }) => void
}) {
  const contactRows = buildContactRows(profile)
  const suspendUserId =
    suspendTarget?.userId && !suspendTarget.isSuspended
      ? suspendTarget.userId
      : null
  const suspendAction =
    suspendUserId && onSuspend ? { userId: suspendUserId, onSuspend } : null

  return (
    <AdminUserCard
      name={name}
      subtitle={subtitle}
      meta={meta}
      photo={profile?.profilePhoto}
      colorKey={suspendTarget?.userId}
      isVerified={profile?.isVerified}
      action={
        suspendAction ? (
          <ListerActionsMenu
            name={name}
            userId={suspendAction.userId}
            onSuspend={suspendAction.onSuspend}
          />
        ) : null
      }
    >
      <AdminChipList
        label="Languages"
        values={profile?.supportLanguages ?? []}
        icon={<Languages className="h-4 w-4" />}
      />

      {showContacts && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            Contacts
          </p>
          {contactRows.length > 0 ? (
            <div className="grid gap-2">
              {contactRows.map((contact) => (
                <AdminContactRow key={contact.label} {...contact} />
              ))}
            </div>
          ) : (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">
              No contact method provided.
            </p>
          )}
        </div>
      )}
    </AdminUserCard>
  )
}

function ListerActionsMenu({
  name,
  userId,
  onSuspend,
}: {
  name: string
  userId: string
  onSuspend: (target: { userId: string; name: string }) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false)
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
        aria-label={`Open actions for ${name}`}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-10 z-20 w-52 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50"
            onClick={() => {
              setIsOpen(false)
              onSuspend({ userId, name })
            }}
          >
            <Ban className="h-4 w-4" />
            Suspend lister
          </button>
        </div>
      )}
    </div>
  )
}
