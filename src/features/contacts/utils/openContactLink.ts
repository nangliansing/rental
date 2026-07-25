import type { ContactLink, ContactType } from "../types"
import { normalizeContactText } from "./contactNormalization"
import { openExternalHref } from "./openExternalHref"

type CopyContactText = (
  type: ContactType,
  text: string,
) => Promise<void> | void

export async function openContactLink(
  contact: ContactLink,
  copy: CopyContactText,
) {
  const href = normalizeContactText(contact.href)
  const copyText = normalizeContactText(contact.copyText)

  const openHref = () => {
    if (href) openExternalHref(href)
  }

  const copyMessage = async () => {
    if (copyText) await copy(contact.type, copyText)
  }

  try {
    if (contact.action === "copy") {
      await copyMessage()
      return
    }

    if (contact.action === "open-and-copy") {
      await copyMessage()
      openHref()
      return
    }

    openHref()
  } catch {
    openHref()

    if (contact.action !== "open") {
      await copyMessage()
    }
  }
}
