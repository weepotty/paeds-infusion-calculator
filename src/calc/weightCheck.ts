import type { AppData } from '../data/types'
import { estimateWeight } from './estimate'
import { formatWeight } from './format'
import type { PatientInput } from './patient'

export type Safeguarding = { weightKg: number; expectedKg: number; message: string }

export type WeightCheck = { ok: false; message: string } | { ok: true; notes: string[]; safeguarding: Safeguarding | null }

export type Submission = PatientInput & { check: WeightCheck }

type CheckData = Pick<AppData, 'weightLimits' | 'weightForAgeChecks' | 'weightFromAge'>

export const checkWeight = (patient: PatientInput, data: CheckData): WeightCheck => {
  const { weightKg } = patient
  const limits = data.weightLimits
  if (weightKg === null) return { ok: false, message: "Enter the child's weight in kg." }
  const kg = formatWeight(weightKg)
  if (weightKg < limits.blockBelowKg || weightKg > limits.blockAboveKg) {
    return {
      ok: false,
      message: `${kg} kg is not a possible weight. Enter a weight between ${formatWeight(limits.blockBelowKg)} and ${formatWeight(limits.blockAboveKg)} kg.`,
    }
  }
  const notes: string[] = []
  if (weightKg < limits.warnBelowKg || weightKg > limits.warnAboveKg) {
    notes.push(`${kg} kg is outside the usual ${formatWeight(limits.warnBelowKg)}–${formatWeight(limits.warnAboveKg)} kg range. Check the weight.`)
  }
  const ageMonths = patient.estimated ? null : patient.ageMonths
  const expectedKg = ageMonths === null ? null : estimateWeight(data.weightFromAge, ageMonths)
  if (expectedKg === null) return { ok: true, notes, safeguarding: null }
  const checks = data.weightForAgeChecks
  const differsByPercent = Math.round(((weightKg - expectedKg) * 100 * 1e6) / expectedKg) / 1e6
  if (-differsByPercent > checks.safeguardingBelowPercent) {
    return { ok: true, notes, safeguarding: { weightKg, expectedKg, message: checks.messageBelow } }
  }
  if (differsByPercent > checks.safeguardingAbovePercent) {
    return { ok: true, notes, safeguarding: { weightKg, expectedKg, message: checks.messageAbove } }
  }
  if (Math.abs(differsByPercent) > checks.checkPercent) {
    const direction = differsByPercent > 0 ? 'higher' : 'lower'
    notes.push(`${kg} kg is ${direction} than expected for this age (about ${formatWeight(expectedKg)} kg). Check the weight and age.`)
  }
  return { ok: true, notes, safeguarding: null }
}

export const safeguardingDetail = (safeguarding: Safeguarding): string =>
  `${formatWeight(safeguarding.weightKg)} kg entered. Expected for age: about ${formatWeight(safeguarding.expectedKg)} kg.`

export const validWeight = (submission: Submission | null): number | null =>
  submission !== null && submission.check.ok ? submission.weightKg : null
