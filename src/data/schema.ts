import { z } from 'zod'
import { unitFamily } from '../calc/units'
import { AMOUNT_UNITS, ageInMonths, parseAge, parseAmount, parseDoseUnit, parseStock, parseVolume } from './parse'

const text = z.string().trim().min(1)
const positive = z.number().positive()
const mustBePositive = { error: 'must be more than 0' }

const parsed = <T>(parse: (value: string) => T | null, example: string) =>
  z.string().transform((value, ctx) => {
    const result = parse(value)
    if (result === null) {
      ctx.addIssue({ code: 'custom', message: `should look like ${example}`, input: value })
      return z.NEVER
    }
    return result
  })

const amount = parsed(parseAmount, `"0.3 mg/kg" or "50 units", using ${AMOUNT_UNITS.join(', ')}`).refine(
  value => value.value > 0,
  mustBePositive,
)
const stock = parsed(parseStock, '"1 mg/mL"').refine(value => value.value > 0, mustBePositive)
const volume = parsed(parseVolume, '"50 mL"').refine(value => value > 0, mustBePositive)
const doseUnit = parsed(parseDoseUnit, '"micrograms/kg/min" or "mg/kg/hour"')
const age = parsed(parseAge, '"1 year" or "6 months"')

const dose = z
  .strictObject({ unit: doseUnit, min: positive, start: positive, max: positive })
  .superRefine((value, ctx) => {
    if (!(value.min <= value.start && value.start <= value.max)) {
      ctx.addIssue({
        code: 'custom',
        message: `must be in order min ≤ start ≤ max (found ${value.min}, ${value.start}, ${value.max})`,
      })
    }
  })

const drug = z
  .strictObject({
    name: text,
    group: z.enum(['vasopressor', 'opioid', 'benzodiazepine', 'induction', 'neuromuscular_blocker', 'other']),
    stock,
    syringe: z.strictObject({ amount, make_up_to: volume, diluent: text.optional() }),
    dose,
    notes: z.string().nullish(),
    reviewed_by: text,
    reviewed_on: text,
  })
  .superRefine((value, ctx) => {
    const syringeUnit = value.syringe.amount.unit
    if (unitFamily(value.stock.unit) !== unitFamily(syringeUnit)) {
      ctx.addIssue({
        code: 'custom',
        path: ['stock'],
        message: `is in ${value.stock.unit} but the syringe amount is in ${syringeUnit}`,
      })
    }
    if (unitFamily(value.dose.unit.unit) !== unitFamily(syringeUnit)) {
      ctx.addIssue({
        code: 'custom',
        path: ['dose', 'unit'],
        message: `is in ${value.dose.unit.unit} but the syringe amount is in ${syringeUnit}`,
      })
    }
  })

const weightBand = z
  .strictObject({
    name: text,
    source: text,
    from_age: age,
    to_age: age,
    age_in: z.enum(['years', 'months']),
    multiply_by: positive,
    then_add_kg: z.number().nonnegative(),
  })
  .superRefine((value, ctx) => {
    if (ageInMonths(value.from_age) > ageInMonths(value.to_age)) {
      ctx.addIssue({ code: 'custom', path: ['to_age'], message: 'must not be before from_age' })
    }
  })

const weightLimits = z
  .strictObject({
    block_below_kg: positive,
    block_above_kg: positive,
    warn_below_kg: positive,
    warn_above_kg: positive,
  })
  .superRefine((value, ctx) => {
    const inOrder =
      value.block_below_kg < value.warn_below_kg &&
      value.warn_below_kg < value.warn_above_kg &&
      value.warn_above_kg < value.block_above_kg
    if (!inOrder) {
      ctx.addIssue({
        code: 'custom',
        message: 'must be in order: block_below_kg < warn_below_kg < warn_above_kg < block_above_kg',
      })
    }
  })

const drugs = z
  .array(drug)
  .min(1)
  .superRefine((value, ctx) => {
    const seen = new Set<string>()
    value.forEach((entry, index) => {
      const key = entry.name.toLowerCase()
      if (seen.has(key)) {
        ctx.addIssue({ code: 'custom', path: [index, 'name'], message: `another drug is also called "${entry.name}"` })
      }
      seen.add(key)
    })
  })

export const fileSchema = z.strictObject({
  version: text,
  updated: text,
  disclaimer: z.strictObject({ title: text, heading: text, text, button: text }),
  prototype_banner: z.string().nullish(),
  report_email: z
    .string()
    .refine(value => value.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()), {
      message: 'must be an email address, or "" to hide the link',
    })
    .nullish(),
  standard_diluent: text,
  weight_limits: weightLimits,
  weight_for_age_checks: z.strictObject({
    check_if_differs_by_percent: positive,
    safeguarding_if_below_by_percent: positive.max(100),
    safeguarding_if_above_by_percent: positive,
    safeguarding_message_below: text,
    safeguarding_message_above: text,
  }),
  weight_from_age: z.array(weightBand),
  drugs,
})

export type DataFile = z.output<typeof fileSchema>
