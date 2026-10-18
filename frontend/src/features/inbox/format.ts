// Formateo de fechas ISO 8601 del contrato con `Intl.DateTimeFormat` (es-ES).
// Sin dependencias externas de i18n.

const listFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const timeFormatter = new Intl.DateTimeFormat('es-ES', {
  hour: '2-digit',
  minute: '2-digit',
})

function parse(iso: string | null): Date | null {
  if (iso === null) return null
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatListTimestamp(iso: string | null): string {
  const date = parse(iso)
  return date === null ? '' : listFormatter.format(date)
}

export function formatMessageTime(iso: string | null): string {
  const date = parse(iso)
  return date === null ? '' : timeFormatter.format(date)
}
