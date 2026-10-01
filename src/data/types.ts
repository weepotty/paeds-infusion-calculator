export type AmountUnit = 'mg' | 'micrograms' | 'nanograms' | 'units'

export type TimeUnit = 'min' | 'hour'

export type Amount = { value: number; unit: AmountUnit; perKg: boolean }

export type Stock = { value: number; unit: AmountUnit }

export type DoseUnit = { unit: AmountUnit; per: TimeUnit }

export type Age = { value: number; unit: 'year' | 'month' }

export type DrugGroup =
  | 'vasopressor'
  | 'opioid'
  | 'benzodiazepine'
  | 'induction'
  | 'neuromuscular_blocker'
  | 'other'

export type Drug = {
  id: string
  name: string
  group: DrugGroup
  stock: Stock
  syringe: { amount: Amount; volumeMl: number; diluent: string | null }
  dose: { unit: DoseUnit; min: number; start: number; max: number }
  notes: string
  reviewedBy: string
  reviewedOn: string
}

export type WeightBand = {
  name: string
  source: string
  fromAge: Age
  toAge: Age
  fromMonths: number
  toMonthsExclusive: number
  ageIn: 'years' | 'months'
  multiplyBy: number
  thenAddKg: number
}

export type AppData = {
  version: string
  updated: string
  disclaimer: { title: string; heading: string; paragraphs: string[]; button: string }
  prototypeBanner: string
  reportEmail: string
  standardDiluent: string
  weightLimits: { blockBelowKg: number; blockAboveKg: number; warnBelowKg: number; warnAboveKg: number }
  weightForAgeChecks: {
    checkPercent: number
    safeguardingBelowPercent: number
    safeguardingAbovePercent: number
    messageBelow: string
    messageAbove: string
  }
  weightFromAge: WeightBand[]
  drugs: Drug[]
}
