export const formatNumber = (n: number): string => (Number.isFinite(n) ? String(Number(n.toPrecision(3))) : '–')

export const formatRate = (n: number): string => {
  if (!Number.isFinite(n)) return '–'
  if (n > 0 && n < 0.005) return '< 0.01'
  return n < 1 ? n.toFixed(2) : n.toFixed(1)
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

export const formatAge = (months: number): string => {
  const years = Math.floor(months / 12)
  const remainder = months % 12
  if (years === 0) return plural(remainder, 'month')
  if (remainder === 0) return plural(years, 'year')
  return `${plural(years, 'year')} ${plural(remainder, 'month')}`
}
