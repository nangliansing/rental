import { useMemo, useState } from "react"
import { Check, Copy } from "lucide-react"

import { Button } from "@/components/ui/button"

import {
  buildErrorTraceLines,
  type ErrorTraceLine,
} from "./formatRouteError"

type ErrorStackTracePanelProps = {
  errorName: string | null
  technicalMessage: string
  stack: string | null
  status: number | null
  detailText: string
}

function TraceLine({ text, kind }: { text: string; kind: ErrorTraceLine["kind"] }) {
  if (kind === "header") {
    return <span className="text-[#f48771]">{text}</span>
  }

  if (kind === "meta") {
    return <span className="text-[#9cdcfe]">{text}</span>
  }

  return <span className="text-[#cccccc]">{text}</span>
}

export function ErrorStackTracePanel({
  errorName,
  technicalMessage,
  stack,
  status,
  detailText,
}: ErrorStackTracePanelProps) {
  const [copied, setCopied] = useState(false)

  const lines = useMemo(
    () =>
      buildErrorTraceLines({
        errorName,
        technicalMessage,
        stack,
        status,
      }),
    [errorName, stack, status, technicalMessage],
  )

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(detailText)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-xl bg-[#1e1e1e] shadow-[0_18px_50px_-30px_rgba(15,23,42,0.55)]">
      <div className="flex items-center justify-between gap-3 px-3 py-2.5">
        <p className="font-mono text-[11px] text-[#888]">error.log</p>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="h-7 text-[#ccc] hover:bg-white/10 hover:text-white"
          onClick={() => void handleCopy()}
        >
          {copied ? (
            <>
              <Check className="size-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              Copy
            </>
          )}
        </Button>
      </div>

      <div className="max-h-80 overflow-auto border-t border-white/6">
        <table className="w-full border-collapse font-mono text-xs leading-6">
          <tbody>
            {lines.map((line) => (
              <tr key={line.lineNumber} className="align-top">
                <td className="w-10 select-none px-3 text-right text-[#555] tabular-nums">
                  {line.lineNumber}
                </td>
                <td className="whitespace-pre px-3 py-0.5">
                  <TraceLine text={line.text} kind={line.kind} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
