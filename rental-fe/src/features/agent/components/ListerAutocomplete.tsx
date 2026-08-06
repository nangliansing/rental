import { useEffect, useId, useRef, useState } from "react"
import { Search } from "lucide-react"
import { useDebouncedCallback } from "use-debounce"

import type { SearchAgentProfile } from "@/features/agent/api/searchAgentProfiles"
import { useAgentTypeahead } from "@/features/agent/hooks/useAgentTypeahead"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { useTypeaheadKeyboardNavigation } from "@/shared/hooks/useTypeaheadKeyboardNavigation"

import {
  LISTER_AUTOCOMPLETE_DEBOUNCE_MS,
  LISTER_AUTOCOMPLETE_MIN_QUERY_LENGTH,
} from "../lister-autocomplete/constants"
import { ListerAutocompleteSuggestions } from "./ListerAutocompleteSuggestions"

type ListerAutocompleteProps = {
  selectedListerIds?: string[]
  onToggleLister: (lister: SearchAgentProfile) => void
  currentUserAgentProfileId?: string | null
  placeholder?: string
  className?: string
  inputClassName?: string
  autoFocus?: boolean
  disabled?: boolean
  id?: string
  /** Fires on every input change so parents can drive a sibling results list. */
  onInputValueChange?: (value: string) => void
  /**
   * When false, only the search field is shown (no floating suggestions).
   * Use with `onInputValueChange` to drive an in-panel results list.
   */
  showSuggestions?: boolean
}

export function ListerAutocomplete({
  selectedListerIds = [],
  onToggleLister,
  currentUserAgentProfileId = null,
  placeholder = "Search lister name",
  className,
  inputClassName,
  autoFocus = false,
  disabled = false,
  id,
  onInputValueChange,
  showSuggestions = true,
}: ListerAutocompleteProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [inputValue, setInputValue] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const {
    query,
    results,
    error,
    isLoading,
    clearError,
    clearResults,
    cancelRequest,
    stopSearch,
    search,
  } = useAgentTypeahead()

  const listboxId = `${inputId}-listbox`
  const optionIdPrefix = `${inputId}-option`
  const suggestionsVisible = showSuggestions && isOpen

  const debouncedSearch = useDebouncedCallback((value: string) => {
    void search(value)
  }, LISTER_AUTOCOMPLETE_DEBOUNCE_MS)

  useEffect(() => () => {
    debouncedSearch.cancel()
    cancelRequest()
  }, [cancelRequest, debouncedSearch])

  useEffect(() => {
    if (!suggestionsVisible) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [suggestionsVisible])

  const { activeIndex, onKeyDown } = useTypeaheadKeyboardNavigation({
    itemCount: showSuggestions ? results.length : 0,
    resetKey: query,
    onDismiss: () => setIsOpen(false),
    onSelect: (index) => {
      const lister = results[index]
      if (lister) onToggleLister(lister)
    },
    onSubmit: () => {
      if (!showSuggestions) return
      if (inputValue.trim().length < LISTER_AUTOCOMPLETE_MIN_QUERY_LENGTH) return
      void search(inputValue)
      setIsOpen(true)
    },
  })

  const handleInputChange = (value: string) => {
    setInputValue(value)
    onInputValueChange?.(value)

    if (!showSuggestions) return

    clearError()
    setIsOpen(true)

    if (value.trim().length < LISTER_AUTOCOMPLETE_MIN_QUERY_LENGTH) {
      debouncedSearch.cancel()
      stopSearch()
      clearResults()
      return
    }

    debouncedSearch(value)
  }

  const handleRetry = () => {
    if (query.length < LISTER_AUTOCOMPLETE_MIN_QUERY_LENGTH) return
    void search(query)
  }

  return (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white p-2 shadow-sm">
        <Input
          id={inputId}
          ref={inputRef}
          name="listerAutocomplete"
          autoComplete="off"
          autoFocus={autoFocus}
          disabled={disabled}
          role={showSuggestions ? "combobox" : "searchbox"}
          aria-autocomplete={showSuggestions ? "list" : undefined}
          aria-expanded={showSuggestions ? isOpen : undefined}
          aria-controls={showSuggestions ? listboxId : undefined}
          aria-activedescendant={
            showSuggestions && activeIndex >= 0
              ? `${optionIdPrefix}-${activeIndex}`
              : undefined
          }
          aria-label={placeholder}
          placeholder={placeholder}
          value={inputValue}
          className={cn(
            "border-none focus-visible:ring-0",
            inputClassName,
          )}
          onFocus={() => {
            if (showSuggestions) setIsOpen(true)
          }}
          onChange={(event) => handleInputChange(event.target.value)}
          onKeyDown={showSuggestions ? onKeyDown : undefined}
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          disabled={disabled}
          aria-label="Search lister"
          onClick={() => {
            if (!showSuggestions) {
              inputRef.current?.focus()
              return
            }
            if (inputValue.trim().length < LISTER_AUTOCOMPLETE_MIN_QUERY_LENGTH) {
              setIsOpen(true)
              return
            }
            void search(inputValue)
            setIsOpen(true)
          }}
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {suggestionsVisible ? (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-950 shadow-lg"
        >
          <ListerAutocompleteSuggestions
            listers={results}
            query={query || inputValue}
            error={error}
            isLoading={isLoading}
            activeIndex={activeIndex}
            optionIdPrefix={optionIdPrefix}
            selectedListerIds={selectedListerIds}
            currentUserAgentProfileId={currentUserAgentProfileId}
            onRetry={handleRetry}
            onToggle={onToggleLister}
          />
        </div>
      ) : null}
    </div>
  )
}
