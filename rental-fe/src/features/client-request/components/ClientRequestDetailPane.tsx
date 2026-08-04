import type { ClientRequest } from "@/features/client-request/api"

type ClientRequestDetailPaneProps = {
  selected: ClientRequest | null
  className?: string
}

export function ClientRequestDetailPane({
  selected,
  className,
}: ClientRequestDetailPaneProps) {
  if (!selected) {
    return (
      <div
        className={
          className ??
          "flex h-full min-h-48 items-center justify-center px-6 text-center"
        }
      >
        <div>
          <h2 className="text-base font-semibold text-slate-950">
            Select a client request
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
            Choose a request from the list to view its details here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={className ?? "px-4 py-5 sm:px-6"}>
      <h2 className="text-lg font-semibold text-slate-950">{selected.name}</h2>
      <p className="mt-1 text-sm text-slate-500">Status: {selected.status}</p>
      <pre
        className="mt-4 overflow-x-auto rounded-lg bg-slate-950 px-3 py-3 text-xs leading-5 text-slate-100"
        data-testid="client-request-raw-detail"
      >
        {JSON.stringify(selected, null, 2)}
      </pre>
    </div>
  )
}
