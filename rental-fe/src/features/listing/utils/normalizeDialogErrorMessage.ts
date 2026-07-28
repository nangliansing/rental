export function normalizeDialogErrorMessage(
  errorMessage: string | null | undefined,
) {
  return typeof errorMessage === "string" ? errorMessage.trim() : ""
}
