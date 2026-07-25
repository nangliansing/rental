export function formatBaht(value: number) {
  return `฿${value.toLocaleString()}`
}

export function formatCompactBaht(value: number) {
  if (value >= 1000) {
    return `฿${Number(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`
  }

  return `฿${value}`
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}
