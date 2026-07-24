import {
    Check,
    Copy,
    Download,
    Mail,
    X,
} from "lucide-react"
import { useMemo, useRef } from "react"
import type { ComponentType, RefObject } from "react"
import { QRCodeCanvas } from "qrcode.react"
import {
    FaFacebook,
    FaLine,
    FaTelegram,
    FaViber,
    FaWhatsapp,
} from "react-icons/fa6"

import {
    DialogDescription,
    DialogShell,
    DialogTitle,
} from "@/shared/components/dialogs/DialogShell"
import { useCopyFeedback } from "@/shared/hooks/useCopyFeedback"

import { getListerProfileUrl } from "@/features/agent/utils/listerProfileUrl"

type ShareableProfile = {
    _id: string
    displayName: string
}

type MyProfileShareModalProps = {
    profile: ShareableProfile
    onClose: () => void
}

type ShareLink = {
    id: string
    label: string
    href: string
    icon: ComponentType<{ className?: string }>
    iconClassName: string
}

function buildShareText(displayName: string, profileUrl: string) {
    return `Check out ${displayName}'s rental profile: ${profileUrl}`
}

function buildShareLinks(displayName: string, profileUrl: string): ShareLink[] {
    const shareText = buildShareText(displayName, profileUrl)
    const encodedUrl = encodeURIComponent(profileUrl)
    const encodedText = encodeURIComponent(shareText)
    const encodedTitle = encodeURIComponent(displayName)

    return [
        {
            id: "line",
            label: "Line",
            href: `https://social-plugins.line.me/lineit/share?url=${encodedUrl}`,
            icon: FaLine,
            iconClassName: "text-[#06c755]",
        },
        {
            id: "viber",
            label: "Viber",
            href: `viber://forward?text=${encodedText}`,
            icon: FaViber,
            iconClassName: "text-[#7360f2]",
        },
        {
            id: "whatsapp",
            label: "WhatsApp",
            href: `https://wa.me/?text=${encodedText}`,
            icon: FaWhatsapp,
            iconClassName: "text-[#25d366]",
        },
        {
            id: "telegram",
            label: "Telegram",
            href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
            icon: FaTelegram,
            iconClassName: "text-[#26a5e4]",
        },
        {
            id: "facebook",
            label: "Facebook",
            href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
            icon: FaFacebook,
            iconClassName: "text-[#1877f2]",
        },
        {
            id: "email",
            label: "Email",
            href: `mailto:?subject=${encodedTitle}&body=${encodedText}`,
            icon: Mail,
            iconClassName: "text-slate-600",
        },
    ]
}

function getQrDownloadName(displayName: string) {
    const safeName = displayName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")

    return `${safeName || "profile"}-qr-code.png`
}

function isExternalShareLink(href: string) {
    return !href.startsWith("mailto:")
}

function saveCanvasAsPng(canvas: HTMLCanvasElement, fileName: string) {
    const link = document.createElement("a")
    link.href = canvas.toDataURL("image/png")
    link.download = fileName
    link.click()
}

export function MyProfileShareModal({
    profile,
    onClose,
}: MyProfileShareModalProps) {
    const { isCopied, copy } = useCopyFeedback()
    const qrCanvasRef = useRef<HTMLCanvasElement | null>(null)

    const profileUrl = useMemo(() => getListerProfileUrl(profile._id), [
        profile._id,
    ])
    const shareLinks = useMemo(
        () => buildShareLinks(profile.displayName, profileUrl),
        [profile.displayName, profileUrl]
    )

    const handleCopyLink = () => {
        void copy("profile-link", profileUrl)
    }

    const handleSaveQr = () => {
        if (!qrCanvasRef.current) return

        saveCanvasAsPng(
            qrCanvasRef.current,
            getQrDownloadName(profile.displayName)
        )
    }

    return (
        <DialogShell
            isOpen
            onDismiss={onClose}
            contentClassName="flex max-w-sm flex-col rounded-2xl text-left"
        >
                    <ModalHeader profileUrl={profileUrl} onClose={onClose} />

                    <div className="overflow-y-auto px-3 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        <QrCodePanel
                            profileUrl={profileUrl}
                            qrCanvasRef={qrCanvasRef}
                            onSaveQr={handleSaveQr}
                        />

                        <CopyLinkButton
                            isCopied={isCopied("profile-link")}
                            onCopy={handleCopyLink}
                        />

                        <div className="my-1 h-px bg-slate-100" />

                        <ShareLinkRail links={shareLinks} onClick={onClose} />
                    </div>
        </DialogShell>
    )
}

function ModalHeader({
    profileUrl,
    onClose,
}: {
    profileUrl: string
    onClose: () => void
}) {
    return (
        <div className="flex shrink-0 items-start justify-between gap-3 rounded-t-2xl bg-white px-5 pb-3 pt-4">
            <div className="min-w-0">
                <DialogTitle
                    className="text-base font-semibold text-slate-950"
                >
                    Share profile
                </DialogTitle>
                <DialogDescription className="mt-1 truncate text-xs text-slate-500">
                    {profileUrl}
                </DialogDescription>
            </div>

            <button
                type="button"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                aria-label="Close share dialog"
                onClick={onClose}
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    )
}

function QrCodePanel({
    profileUrl,
    qrCanvasRef,
    onSaveQr,
}: {
    profileUrl: string
    qrCanvasRef: RefObject<HTMLCanvasElement | null>
    onSaveQr: () => void
}) {
    return (
        <div className="mx-auto mb-3 flex w-fit flex-col items-center gap-3 rounded-2xl bg-slate-50 p-3 sm:p-4">
            <div className="rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-200 sm:p-3">
                <QRCodeCanvas
                    ref={qrCanvasRef}
                    value={profileUrl}
                    size={144}
                    bgColor="#ffffff"
                    fgColor="#020617"
                    level="M"
                    marginSize={1}
                />
            </div>

            <button
                type="button"
                className="flex h-9 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-100"
                onClick={onSaveQr}
            >
                <Download className="h-4 w-4" />
                Save QR
            </button>
        </div>
    )
}

function CopyLinkButton({
    isCopied,
    onCopy,
}: {
    isCopied: boolean
    onCopy: () => void
}) {
    return (
        <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-100"
            onClick={onCopy}
        >
            {isCopied ? (
                <Check className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
                <Copy className="h-4 w-4 shrink-0 text-slate-500" />
            )}
            <span>{isCopied ? "Copied link" : "Copy link"}</span>
        </button>
    )
}

function ShareLinkRail({
    links,
    onClick,
}: {
    links: ShareLink[]
    onClick: () => void
}) {
    return (
        <div className="relative">
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {links.map((link) => (
                    <ShareLinkItem
                        key={link.id}
                        link={link}
                        onClick={onClick}
                    />
                ))}
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent" />
        </div>
    )
}

function ShareLinkItem({
    link,
    onClick,
}: {
    link: ShareLink
    onClick: () => void
}) {
    const Icon = link.icon
    const shouldOpenInNewTab = isExternalShareLink(link.href)

    return (
        <a
            href={link.href}
            target={shouldOpenInNewTab ? "_blank" : undefined}
            rel={shouldOpenInNewTab ? "noreferrer" : undefined}
            className="flex w-20 shrink-0 flex-col items-center gap-2 rounded-xl px-2 py-3 text-center text-xs font-semibold text-slate-700 hover:bg-slate-100"
            onClick={onClick}
        >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                <Icon className={`h-5 w-5 ${link.iconClassName}`} />
            </span>
            <span className="max-w-full truncate">{link.label}</span>
        </a>
    )
}
