import { parse, YAMLParseError } from 'yaml'
import { describeIssue } from './messages'
import { ageEndMonths, ageInMonths } from './parse'
import { type DataFile, fileSchema } from './schema'
import type { AppData } from './types'

export type LoadResult = { ok: true; data: AppData } | { ok: false; errors: string[] }

type ReadResult = { ok: true; raw: unknown } | { ok: false; error: string }

const readYaml = (yamlText: string): ReadResult => {
  try {
    return { ok: true, raw: parse(yamlText) ?? null }
  } catch (error) {
    const message = error instanceof YAMLParseError ? error.message : String(error)
    return { ok: false, error: `drugs.yaml could not be read: ${message}` }
  }
}

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const toAppData = (file: DataFile): AppData => ({
  version: file.version,
  updated: file.updated,
  disclaimer: {
    title: file.disclaimer.title,
    heading: file.disclaimer.heading,
    paragraphs: file.disclaimer.text
      .split(/\n\s*\n/)
      .map(paragraph => paragraph.trim())
      .filter(paragraph => paragraph !== ''),
    button: file.disclaimer.button,
  },
  prototypeBanner: (file.prototype_banner ?? '').trim(),
  standardDiluent: file.standard_diluent,
  weightLimits: {
    blockBelowKg: file.weight_limits.block_below_kg,
    blockAboveKg: file.weight_limits.block_above_kg,
    warnBelowKg: file.weight_limits.warn_below_kg,
    warnAboveKg: file.weight_limits.warn_above_kg,
  },
  weightForAgeChecks: {
    checkPercent: file.weight_for_age_checks.check_if_differs_by_percent,
    safeguardingBelowPercent: file.weight_for_age_checks.safeguarding_if_below_by_percent,
    safeguardingAbovePercent: file.weight_for_age_checks.safeguarding_if_above_by_percent,
    messageBelow: file.weight_for_age_checks.safeguarding_message_below,
    messageAbove: file.weight_for_age_checks.safeguarding_message_above,
  },
  weightFromAge: file.weight_from_age.map(band => ({
    name: band.name,
    source: band.source,
    fromAge: band.from_age,
    toAge: band.to_age,
    fromMonths: ageInMonths(band.from_age),
    toMonthsExclusive: ageEndMonths(band.to_age),
    ageIn: band.age_in,
    multiplyBy: band.multiply_by,
    thenAddKg: band.then_add_kg,
  })),
  drugs: file.drugs.map((drug, index) => ({
    id: `${index}-${slug(drug.name)}`,
    name: drug.name,
    group: drug.group,
    stock: drug.stock,
    syringe: { amount: drug.syringe.amount, volumeMl: drug.syringe.make_up_to, diluent: drug.syringe.diluent ?? null },
    dose: drug.dose,
    notes: drug.notes ?? '',
    reviewedBy: drug.reviewed_by,
    reviewedOn: drug.reviewed_on,
  })),
})

export const loadData = (yamlText: string): LoadResult => {
  const read = readYaml(yamlText)
  if (!read.ok) return { ok: false, errors: [read.error] }
  const result = fileSchema.safeParse(read.raw, { reportInput: true })
  if (!result.success) {
    return { ok: false, errors: result.error.issues.map(issue => describeIssue(issue, read.raw)) }
  }
  return { ok: true, data: toAppData(result.data) }
}

export const loadDataOrThrow = (yamlText: string): AppData => {
  const result = loadData(yamlText)
  if (!result.ok) throw new Error(`drugs.yaml has problems:\n${result.errors.join('\n')}`)
  return result.data
}
