export function RouteLoadingFallback() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      Loading page...
    </div>
  );
}
