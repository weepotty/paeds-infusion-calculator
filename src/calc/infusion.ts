import type { Drug } from '../data/types'
import { convertAmount } from './units'

export type Infusion = {
  totalAmount: number
  concentrationPerMl: number
  rateMlPerHour: number
  oneMlPerHour: number
  drawUpMl: number
  fits: boolean
}

export const calculateInfusion = (drug: Drug, weightKg: number, dose: number): Infusion => {
  const { amount, volumeMl } = drug.syringe
  const totalAmount = amount.perKg ? amount.value * weightKg : amount.value
  const concentrationPerMl = totalAmount / volumeMl
  const perHour = drug.dose.unit.per === 'min' ? 60 : 1
  const doseUnit = drug.dose.unit.unit
  const rateMlPerHour = (convertAmount(dose, doseUnit, amount.unit) * weightKg * perHour) / concentrationPerMl
  const oneMlPerHour = convertAmount(concentrationPerMl, amount.unit, doseUnit) / weightKg / perHour
  const drawUpMl = convertAmount(totalAmount, amount.unit, drug.stock.unit) / drug.stock.value
  return { totalAmount, concentrationPerMl, rateMlPerHour, oneMlPerHour, drawUpMl, fits: drawUpMl < volumeMl }
}

export const startDoses = (drugs: Drug[]): Record<string, number> =>
  Object.fromEntries(drugs.map(drug => [drug.id, drug.dose.start]))
