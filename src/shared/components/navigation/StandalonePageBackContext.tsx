import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

type StandalonePageBackHandler = (() => void) | null

type StandalonePageBackContextValue = {
  setBackHandler: (handler: StandalonePageBackHandler) => void
  backHandler: StandalonePageBackHandler
}

const StandalonePageBackContext =
  createContext<StandalonePageBackContextValue | null>(null)

export function StandalonePageBackProvider({
  children,
}: {
  children: ReactNode
}) {
  const [backHandler, setBackHandlerState] =
    useState<StandalonePageBackHandler>(null)

  const setBackHandler = useCallback((handler: StandalonePageBackHandler) => {
    setBackHandlerState(() => handler)
  }, [])

  const value = useMemo(
    () => ({
      backHandler,
      setBackHandler,
    }),
    [backHandler, setBackHandler],
  )

  return (
    <StandalonePageBackContext.Provider value={value}>
      {children}
    </StandalonePageBackContext.Provider>
  )
}

export function useStandalonePageBackContext() {
  return useContext(StandalonePageBackContext)
}

export function useStandalonePageBack(handler: () => void) {
  const context = useStandalonePageBackContext()

  useEffect(() => {
    if (!context) {
      return
    }

    context.setBackHandler(handler)

    return () => {
      context.setBackHandler(null)
    }
  }, [context, handler])
}
