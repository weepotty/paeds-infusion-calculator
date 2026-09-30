# Paeds Infusion Calculator Implementation Plan

**Goal:** Build the real calculator from `drugs.yaml`, test it, and deploy it to GitHub Pages with checks on every change.

**Architecture:** A static Vite + React + TypeScript app. `drugs.yaml` is bundled at build time, validated with Zod and turned into typed objects (`src/data`). The maths are pure functions (`src/calc`). The screens are small React components (`src/components`) wired together in `App.tsx`. A GitHub Actions workflow validates, tests, builds and deploys.

**Tech Stack:** Node 24, Vite 8, React 19, TypeScript, Zod 4, `yaml` 2, Vitest 5 + jsdom 29 + Testing Library, vite-plugin-pwa, @fontsource/roboto, tsx.

**Spec:** `docs/design.md`

## Global Constraints

- All clinical content (doses, limits, messages, disclaimer, banner) comes from `drugs.yaml`. No clinical number or wording in code.
- Tests never depend on the values in `drugs.yaml`. They use the fixture `src/test/fixture-drugs.yaml`, so the editor can change doses without breaking CI. The only test of the real file checks that it is valid and gives a finite rate for every drug.
- UK English everywhere: "micrograms", "nanograms", "colour", "organisation".
- Rates: 1 decimal place, 2 below 1 mL/hr. Other numbers: up to 3 significant figures, trailing zeros removed. Round for display only.
- React: no `React.FC`; no `&&` in JSX (use `condition ? <El /> : null`); no nested ternaries.
- TypeScript: no `as` casts outside test files.
- No code comments unless explaining a deliberate departure from convention.
- Commits: author `weepotty@gmail.com` (already set in the repo's git config). No `Co-Authored-By` trailers, no session links, no tool attribution anywhere.
- Pages base path: `/paeds-infusion-calculator/`.
- Phone first: 16px side gutter, no horizontal scroll at 360px width.
- Run `nvm use` (reads `.nvmrc`, Node 24) in every new shell before npm commands.

## Review Focus

1. Phone keyboards that type a decimal comma ("14,5") in the weight or dose box: read as 14.5, not rejected. Tests: Task 7, Task 8.
2. A dose box that is emptied or part-typed ("", "0.", "abc"): the rate keeps its last valid value and never shows NaN. Test: Task 8.
3. Editor spacing and case variants in `drugs.yaml` ("0.3mg/kg", "0.3 mg / kg", "50 ML") are accepted. "mcg" and "0,3" are rejected with a fix-it message. Test: Task 3.
4. Pressing Submit again on the same flagged weight after "Proceed" shows the mask again. Test: Task 10.
5. A rate so small it would show as "0.00" shows "< 0.01" instead. Test: Task 4.

---

## File map

```
.nvmrc, .gitignore, package.json, tsconfig.json, vite.config.ts, index.html
public/icon.svg
drugs.yaml                         (modified: prototype_banner, comment fix)
scripts/validate-data.ts           CLI: validate drugs.yaml, print plain-English errors
scripts/rate-table.ts              CLI: before/after rate table (markdown)
src/main.tsx                       entry: fonts, styles, PWA, <App data>
src/App.tsx                        state and wiring
src/styles.css                     all styling (ported from the prototype)
src/data/types.ts                  AppData, Drug, WeightBand, units
src/data/parse.ts                  "0.3 mg/kg" etc → typed values
src/data/schema.ts                 Zod schema for the raw YAML
src/data/messages.ts               Zod issue → "Adrenaline → dose → max: …"
src/data/load.ts                   loadData(text) / loadDataOrThrow(text)
src/data/groups.ts                 group order, labels, ISO colours
src/data/index.ts                  bundles ../../drugs.yaml
src/calc/units.ts                  unit conversion, unit family, dose label
src/calc/infusion.ts               calculateInfusion, startDoses
src/calc/format.ts                 formatNumber, formatRate, formatAge
src/calc/patient.ts                parseAgeInput, parseDecimalInput, PatientInput
src/calc/estimate.ts               findWeightBand, estimateWeight, text helpers
src/calc/weightCheck.ts            checkWeight, Submission, validWeight
src/calc/rateTable.ts              rateTable (markdown)
src/components/Disclaimer.tsx, Banner.tsx, PatientForm.tsx, ResultsSummary.tsx,
  DrugList.tsx, DrugRow.tsx, DoseInput.tsx, SafeguardingMask.tsx, SafeguardingFlag.tsx
src/test/setup.ts, fixture-drugs.yaml, fixture.ts
.github/workflows/deploy.yml
```

---

### Task 1: Commit pending work and scaffold the toolchain

**Files:**
- Create: `.nvmrc`, `.gitignore`, `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/test/setup.ts`, `src/App.test.tsx`

**Interfaces:**
- Produces: `npm run dev | test | typecheck | build`; `App` (replaced in Task 10).

- [ ] **Step 1: Commit the spec, plan and pending data/README edits**

```bash
cd /Users/shona/code/paeds-infusion-calculator
git add drugs.yaml README.md docs/design.md docs/plan.md
git commit -m "Add design spec and plan; add disclaimer and thiopental to drug data"
```

- [ ] **Step 2: Create `.nvmrc`, `.gitignore`, `package.json`**

`.nvmrc`:
```
24
```

`.gitignore`:
```
node_modules
dist
dev-dist
*.local
.DS_Store
```

`package.json`:
```json
{
  "name": "paeds-infusion-calculator",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "validate": "tsx scripts/validate-data.ts drugs.yaml",
    "typecheck": "tsc",
    "test": "vitest run",
    "build": "npm run validate && tsc && vite build",
    "preview": "vite preview",
    "rate-table": "tsx scripts/rate-table.ts"
  }
}
```

- [ ] **Step 3: Install dependencies**

```bash
nvm use
npm install react react-dom zod yaml @fontsource/roboto
npm install -D vite @vitejs/plugin-react typescript @types/react @types/react-dom @types/node@24 vitest jsdom@29 @testing-library/react @testing-library/dom @testing-library/user-event @testing-library/jest-dom tsx vite-plugin-pwa
```

Expected: installs without `EBADENGINE` errors on Node 24.

- [ ] **Step 4: Create `tsconfig.json`, `vite.config.ts`, `index.html`**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "types": ["vite/client", "node"]
  },
  "include": ["src", "scripts", "vite.config.ts"]
}
```

`vite.config.ts`:
```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: '/paeds-infusion-calculator/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
  },
})
```

`index.html`:
```html
<!doctype html>
<html lang="en-GB">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#0B5C8C" />
    <title>Paeds Infusion Calculator</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Write the failing smoke test**

`src/test/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => cleanup())
```

`src/App.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { App } from './App'

it('renders the app name', () => {
  render(<App />)
  expect(screen.getByText('Paeds Infusion Calculator')).toBeInTheDocument()
})
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npm test`
Expected: FAIL, cannot resolve `./App`.

- [ ] **Step 7: Create `src/App.tsx` and `src/main.tsx`**

`src/App.tsx`:
```tsx
export const App = () => <h1>Paeds Infusion Calculator</h1>
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'

const root = document.getElementById('root')

if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
```

- [ ] **Step 8: Run tests and typecheck**

Run: `npm test && npm run typecheck`
Expected: 1 test passes; `tsc` prints nothing. If `tsc` rejects a `tsconfig` option under TypeScript 7, run `npm install -D typescript@5` and rerun.

- [ ] **Step 9: Commit**

```bash
git add .nvmrc .gitignore package.json package-lock.json tsconfig.json vite.config.ts index.html src
git commit -m "Scaffold Vite, React, TypeScript and Vitest"
```

---

### Task 2: Types and value parsers

**Files:**
- Create: `src/data/types.ts`, `src/data/parse.ts`
- Test: `src/data/parse.test.ts`

**Interfaces:**
- Produces:
  - Types: `AmountUnit`, `TimeUnit`, `Amount`, `Stock`, `DoseUnit`, `Age`, `DrugGroup`, `Drug`, `WeightBand`, `AppData`.
  - `AMOUNT_UNITS: AmountUnit[]`
  - `parseAmount(text: string): Amount | null`
  - `parseStock(text: string): Stock | null`
  - `parseVolume(text: string): number | null`
  - `parseDoseUnit(text: string): DoseUnit | null`
  - `parseAge(text: string): Age | null`
  - `ageInMonths(age: Age): number`
  - `ageEndMonths(age: Age): number` (exclusive upper bound covering the whole year or month)

- [ ] **Step 1: Create `src/data/types.ts`**

```ts
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
```

- [ ] **Step 2: Write the failing tests**

`src/data/parse.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { ageEndMonths, ageInMonths, parseAge, parseAmount, parseDoseUnit, parseStock, parseVolume } from './parse'

describe('parseAmount', () => {
  it.each([
    ['0.3 mg/kg', { value: 0.3, unit: 'mg', perKg: true }],
    ['50 units', { value: 50, unit: 'units', perKg: false }],
    ['200 micrograms', { value: 200, unit: 'micrograms', perKg: false }],
    ['0.3mg/kg', { value: 0.3, unit: 'mg', perKg: true }],
    ['0.3 mg / kg', { value: 0.3, unit: 'mg', perKg: true }],
    [' 15 MG/KG ', { value: 15, unit: 'mg', perKg: true }],
  ])('reads %j', (text, expected) => {
    expect(parseAmount(text)).toEqual(expected)
  })

  it.each(['0,3 mg/kg', '.3 mg/kg', '0.3 mcg/kg', 'mg/kg', '0.3', '0.3 mg/kg/min'])('rejects %j', text => {
    expect(parseAmount(text)).toBeNull()
  })
})

describe('parseStock', () => {
  it('reads a strength per mL', () => {
    expect(parseStock('1 mg/mL')).toEqual({ value: 1, unit: 'mg' })
    expect(parseStock('100 units/ml')).toEqual({ value: 100, unit: 'units' })
    expect(parseStock('50 micrograms / mL')).toEqual({ value: 50, unit: 'micrograms' })
  })

  it('rejects anything not per mL', () => {
    expect(parseStock('1 mg')).toBeNull()
    expect(parseStock('1 mg/L')).toBeNull()
  })
})

describe('parseVolume', () => {
  it('reads mL', () => {
    expect(parseVolume('50 mL')).toBe(50)
    expect(parseVolume('50ML')).toBe(50)
  })

  it('rejects other units', () => {
    expect(parseVolume('50')).toBeNull()
    expect(parseVolume('0.05 L')).toBeNull()
  })
})

describe('parseDoseUnit', () => {
  it.each([
    ['micrograms/kg/min', { unit: 'micrograms', per: 'min' }],
    ['mg/kg/hour', { unit: 'mg', per: 'hour' }],
    ['units / kg / hour', { unit: 'units', per: 'hour' }],
    ['nanograms/kg/min', { unit: 'nanograms', per: 'min' }],
  ])('reads %j', (text, expected) => {
    expect(parseDoseUnit(text)).toEqual(expected)
  })

  it.each(['micrograms/min', 'mcg/kg/min', 'mg/kg/hr', 'mg/kg'])('rejects %j', text => {
    expect(parseDoseUnit(text)).toBeNull()
  })
})

describe('parseAge', () => {
  it('reads years and months', () => {
    expect(parseAge('1 year')).toEqual({ value: 1, unit: 'year' })
    expect(parseAge('13 years')).toEqual({ value: 13, unit: 'year' })
    expect(parseAge('0 months')).toEqual({ value: 0, unit: 'month' })
  })

  it('rejects fractions and other words', () => {
    expect(parseAge('1.5 years')).toBeNull()
    expect(parseAge('13 yrs')).toBeNull()
  })

  it('converts to months, including the whole of the last year or month', () => {
    expect(ageInMonths({ value: 1, unit: 'year' })).toBe(12)
    expect(ageEndMonths({ value: 13, unit: 'year' })).toBe(168)
    expect(ageEndMonths({ value: 6, unit: 'month' })).toBe(7)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/data/parse.test.ts`
Expected: FAIL, cannot resolve `./parse`.

- [ ] **Step 4: Implement `src/data/parse.ts`**

```ts
import type { Age, Amount, AmountUnit, DoseUnit, Stock } from './types'

export const AMOUNT_UNITS: AmountUnit[] = ['mg', 'micrograms', 'nanograms', 'units']

const NUMBER = String.raw`(\d+(?:\.\d+)?)`
const UNIT = `(${AMOUNT_UNITS.join('|')})`

const match = (pattern: string, text: string) => new RegExp(String.raw`^\s*${pattern}\s*$`, 'i').exec(text)

const toAmountUnit = (text: string): AmountUnit | null =>
  AMOUNT_UNITS.find(unit => unit === text.toLowerCase()) ?? null

export const parseAmount = (text: string): Amount | null => {
  const found = match(String.raw`${NUMBER}\s*${UNIT}(\s*/\s*kg)?`, text)
  const unit = found ? toAmountUnit(found[2]) : null
  if (!found || !unit) return null
  return { value: Number(found[1]), unit, perKg: found[3] !== undefined }
}

export const parseStock = (text: string): Stock | null => {
  const found = match(String.raw`${NUMBER}\s*${UNIT}\s*/\s*ml`, text)
  const unit = found ? toAmountUnit(found[2]) : null
  if (!found || !unit) return null
  return { value: Number(found[1]), unit }
}

export const parseVolume = (text: string): number | null => {
  const found = match(String.raw`${NUMBER}\s*ml`, text)
  return found ? Number(found[1]) : null
}

export const parseDoseUnit = (text: string): DoseUnit | null => {
  const found = match(String.raw`${UNIT}\s*/\s*kg\s*/\s*(min|hour)`, text)
  const unit = found ? toAmountUnit(found[1]) : null
  if (!found || !unit) return null
  return { unit, per: found[2].toLowerCase() === 'min' ? 'min' : 'hour' }
}

export const parseAge = (text: string): Age | null => {
  const found = match(String.raw`(\d+)\s*(years?|months?)`, text)
  if (!found) return null
  return { value: Number(found[1]), unit: found[2].toLowerCase().startsWith('y') ? 'year' : 'month' }
}

const monthsPer = (age: Age) => (age.unit === 'year' ? 12 : 1)

export const ageInMonths = (age: Age): number => age.value * monthsPer(age)

export const ageEndMonths = (age: Age): number => (age.value + 1) * monthsPer(age)
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/data/parse.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data
git commit -m "Parse readable units, strengths, volumes and ages"
```

---

### Task 3: Schema, loader and plain-English errors

**Files:**
- Modify: `drugs.yaml` (add `prototype_banner`, fix the `weight_for_age_checks` comment)
- Create: `src/calc/units.ts` (only `unitFamily` for now; extended in Task 4), `src/data/groups.ts`, `src/data/schema.ts`, `src/data/messages.ts`, `src/data/load.ts`, `src/data/index.ts`, `scripts/validate-data.ts`, `src/test/fixture-drugs.yaml`, `src/test/fixture.ts`
- Test: `src/data/load.test.ts`, `src/data/drugs-file.test.ts`

**Interfaces:**
- Consumes: parsers and types from Task 2.
- Produces:
  - `unitFamily(unit: AmountUnit): 'mass' | 'units'`
  - `DRUG_GROUPS: { key: DrugGroup; label: string; colour: string }[]`
  - `type LoadResult = { ok: true; data: AppData } | { ok: false; errors: string[] }`
  - `loadData(yamlText: string): LoadResult`
  - `loadDataOrThrow(yamlText: string): AppData`
  - `data: AppData` from `src/data/index.ts`
  - Test helpers: `fixtureYaml: string`, `fixture: AppData`, `fixtureDrug(name: string): Drug`
  - `npm run validate`

- [ ] **Step 1: Edit `drugs.yaml`**

After the `disclaimer:` block (after `button: I understand`), add:

```yaml

# The thin banner at the top of the page. Set it to "" to hide it.
prototype_banner: Prototype only. Not for clinical use.
```

Replace the comment above `weight_for_age_checks:` with:

```yaml
# Weight compared with the expected weight for age (from weight_from_age below).
# Only runs when an age is entered and the weight was measured, not estimated.
#   check: a red "check the weight and age" note. Rates are still shown.
#   safeguarding: the rates are hidden behind a warning showing the message below,
#   until the user confirms the weight.
```

Then copy it as the test fixture:

```bash
mkdir -p src/test && cp drugs.yaml src/test/fixture-drugs.yaml
```

- [ ] **Step 2: Create `src/calc/units.ts` and `src/data/groups.ts`**

`src/calc/units.ts`:
```ts
import type { AmountUnit } from '../data/types'

export const unitFamily = (unit: AmountUnit): 'mass' | 'units' => (unit === 'units' ? 'units' : 'mass')
```

`src/data/groups.ts`:
```ts
import type { DrugGroup } from './types'

export const DRUG_GROUPS: { key: DrugGroup; label: string; colour: string }[] = [
  { key: 'vasopressor', label: 'Vasopressors and inotropes', colour: 'var(--iso-vaso)' },
  { key: 'opioid', label: 'Opioids', colour: 'var(--iso-opioid)' },
  { key: 'benzodiazepine', label: 'Benzodiazepines', colour: 'var(--iso-benzo)' },
  { key: 'induction', label: 'Induction agents', colour: 'var(--iso-induction)' },
  { key: 'neuromuscular_blocker', label: 'Neuromuscular blockers', colour: 'var(--iso-nmb)' },
  { key: 'other', label: 'Other', colour: 'var(--iso-other)' },
]
```

- [ ] **Step 3: Create the fixture helper**

`src/test/fixture.ts`:
```ts
import { loadDataOrThrow } from '../data/load'
import type { Drug } from '../data/types'
import raw from './fixture-drugs.yaml?raw'

export const fixtureYaml = raw

export const fixture = loadDataOrThrow(raw)

export const fixtureDrug = (name: string): Drug => {
  const drug = fixture.drugs.find(candidate => candidate.name === name)
  if (!drug) throw new Error(`No fixture drug called ${name}`)
  return drug
}
```

- [ ] **Step 4: Write the failing tests**

`src/data/load.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { fixtureYaml } from '../test/fixture'
import { loadData } from './load'

const errorsFor = (yamlText: string): string[] => {
  const result = loadData(yamlText)
  if (result.ok) throw new Error('Expected the data to be rejected')
  return result.errors
}

const broken = (find: string, replace: string) => {
  expect(fixtureYaml).toContain(find)
  return errorsFor(fixtureYaml.replace(find, replace))
}

describe('loadData', () => {
  it('reads the fixture into typed data', () => {
    const result = loadData(fixtureYaml)
    if (!result.ok) throw new Error(result.errors.join('\n'))
    const adrenaline = result.data.drugs[0]
    expect(adrenaline).toMatchObject({
      name: 'Adrenaline',
      group: 'vasopressor',
      stock: { value: 1, unit: 'mg' },
      syringe: { amount: { value: 0.3, unit: 'mg', perKg: true }, volumeMl: 50, diluent: null },
      dose: { unit: { unit: 'micrograms', per: 'min' }, min: 0.05, start: 0.1, max: 1 },
      notes: '',
    })
    expect(result.data.disclaimer.paragraphs).toHaveLength(2)
    expect(result.data.prototypeBanner).toBe('Prototype only. Not for clinical use.')
    expect(result.data.weightFromAge[0]).toMatchObject({ fromMonths: 12, toMonthsExclusive: 168, ageIn: 'years' })
    expect(new Set(result.data.drugs.map(drug => drug.id)).size).toBe(result.data.drugs.length)
  })

  it('accepts spacing and case variants', () => {
    const result = loadData(fixtureYaml.replace('amount: 0.3 mg/kg', 'amount: 0.3MG / kg').replace('make_up_to: 50 mL', 'make_up_to: 50 ML'))
    expect(result.ok).toBe(true)
  })

  it('rejects a decimal comma', () => {
    expect(broken('max: 1\n', 'max: 1,5\n')).toContain('Adrenaline → dose → max: must be a number (found "1,5")')
  })

  it('rejects a misspelt field', () => {
    const errors = broken('    reviewed_by: PLACEHOLDER', '    reviewd_by: PLACEHOLDER')
    expect(errors).toContain('Adrenaline: unknown field "reviewd_by". Check the spelling.')
    expect(errors).toContain('Adrenaline → reviewed_by: is missing')
  })

  it('rejects an empty reviewed_by', () => {
    expect(broken('reviewed_by: PLACEHOLDER', 'reviewed_by:')).toContain('Adrenaline → reviewed_by: is empty')
  })

  it('rejects an unknown unit, with an example', () => {
    expect(broken('amount: 0.3 mg/kg', 'amount: 0.3 mcg/kg')).toContainEqual(
      expect.stringContaining('Adrenaline → syringe → amount: should look like "0.3 mg/kg"'),
    )
  })

  it('rejects an unknown group', () => {
    expect(broken('group: vasopressor', 'group: vasopresor')).toContain(
      'Adrenaline → group: must be one of: vasopressor, opioid, benzodiazepine, induction, neuromuscular_blocker, other (found "vasopresor")',
    )
  })

  it('rejects a zero strength', () => {
    expect(broken('stock: 1 mg/mL', 'stock: 0 mg/mL')).toContain('Adrenaline → stock: must be more than 0')
  })

  it('rejects doses out of order', () => {
    expect(broken('start: 0.1', 'start: 5')).toContain('Adrenaline → dose: must be in order min ≤ start ≤ max (found 0.05, 5, 1)')
  })

  it('rejects a dose unit that cannot be converted to the syringe unit', () => {
    expect(broken('unit: units/kg/hour', 'unit: mg/kg/hour')).toContain(
      'Insulin (soluble) → dose → unit: is in mg but the syringe amount is in units',
    )
  })

  it('rejects two drugs with the same name', () => {
    expect(broken('name: Noradrenaline', 'name: Adrenaline')).toContain('Adrenaline → name: another drug is also called "Adrenaline"')
  })

  it('rejects weight limits out of order', () => {
    expect(broken('warn_above_kg: 80', 'warn_above_kg: 200')).toContain(
      'weight_limits: must be in order: block_below_kg < warn_below_kg < warn_above_kg < block_above_kg',
    )
  })

  it('reports broken YAML', () => {
    expect(errorsFor('drugs:\n  - name: A\n   group: other')[0]).toMatch(/^drugs\.yaml could not be read/)
  })

  it('reports an empty file', () => {
    expect(errorsFor('')).toEqual(['drugs.yaml: is empty'])
  })
})
```

`src/data/drugs-file.test.ts`:
```ts
import { expect, it } from 'vitest'
import raw from '../../drugs.yaml?raw'
import { loadData } from './load'

it('drugs.yaml is valid', () => {
  const result = loadData(raw)
  expect(result.ok ? [] : result.errors).toEqual([])
})
```

- [ ] **Step 5: Run tests to verify they fail**

Run: `npx vitest run src/data`
Expected: FAIL, cannot resolve `./load`.

- [ ] **Step 6: Implement `src/data/schema.ts`**

```ts
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
```

- [ ] **Step 7: Implement `src/data/messages.ts`**

```ts
import type { z } from 'zod'

const EXPECTED: Record<string, string> = {
  number: 'a number',
  string: 'text',
  array: 'a list',
  object: 'a section',
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const childOf = (node: unknown, key: PropertyKey): unknown => {
  if (Array.isArray(node) && typeof key === 'number') return node[key]
  if (isRecord(node) && typeof key === 'string') return node[key]
  return undefined
}

const nameOf = (item: unknown, index: number): string =>
  isRecord(item) && typeof item.name === 'string' && item.name !== '' ? item.name : `entry ${index + 1}`

export const describePath = (path: readonly PropertyKey[], raw: unknown): string => {
  const parts: string[] = []
  let node = raw
  path.forEach((key, index) => {
    const child = childOf(node, key)
    if (typeof key === 'number') {
      parts.push(nameOf(child, key))
    } else if (!(key === 'drugs' && typeof path[index + 1] === 'number')) {
      parts.push(String(key))
    }
    node = child
  })
  return parts.length === 0 ? 'drugs.yaml' : parts.join(' → ')
}

const problem = (issue: z.core.$ZodIssue): string => {
  switch (issue.code) {
    case 'invalid_type':
      if (issue.input === undefined) return 'is missing'
      if (issue.input === null) return 'is empty'
      return `must be ${EXPECTED[issue.expected] ?? issue.expected}`
    case 'unrecognized_keys':
      return `unknown field ${issue.keys.map(key => `"${key}"`).join(', ')}. Check the spelling.`
    case 'too_small':
      if (issue.origin === 'string') return 'must not be empty'
      if (issue.origin === 'array') return `must have at least ${issue.minimum} entry`
      return `must be ${issue.inclusive ? 'at least' : 'more than'} ${issue.minimum}`
    case 'too_big':
      return `must be ${issue.inclusive ? 'at most' : 'less than'} ${issue.maximum}`
    case 'invalid_value':
      return `must be one of: ${issue.values.map(String).join(', ')}`
    default:
      return issue.message
  }
}

const foundText = (issue: z.core.$ZodIssue): string => {
  const input = issue.input
  const printable = typeof input === 'string' || typeof input === 'number' || typeof input === 'boolean'
  if (!printable || input === '' || issue.code === 'unrecognized_keys') return ''
  return ` (found ${JSON.stringify(input)})`
}

export const describeIssue = (issue: z.core.$ZodIssue, raw: unknown): string =>
  `${describePath(issue.path, raw)}: ${problem(issue)}${foundText(issue)}`
```

- [ ] **Step 8: Implement `src/data/load.ts` and `src/data/index.ts`**

`src/data/load.ts`:
```ts
import { parse, YAMLParseError } from 'yaml'
import { describeIssue } from './messages'
import { ageEndMonths, ageInMonths } from './parse'
import { type DataFile, fileSchema } from './schema'
import type { AppData } from './types'

export type LoadResult = { ok: true; data: AppData } | { ok: false; errors: string[] }

type ReadResult = { ok: true; raw: unknown } | { ok: false; error: string }

const readYaml = (yamlText: string): ReadResult => {
  try {
    return { ok: true, raw: parse(yamlText) }
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
```

`src/data/index.ts`:
```ts
import raw from '../../drugs.yaml?raw'
import { loadDataOrThrow } from './load'

export const data = loadDataOrThrow(raw)
```

- [ ] **Step 9: Run tests; fix messages until they match**

Run: `npx vitest run src/data`
Expected: PASS. If a message differs only because Zod 4 reports an issue under a different `code` or `origin`, adjust `problem()` in `messages.ts`, not the test's expected text. The expected text is the contract the editor sees.

- [ ] **Step 10: Create `scripts/validate-data.ts`**

```ts
import { readFileSync } from 'node:fs'
import { loadData } from '../src/data/load'

const path = process.argv[2] ?? 'drugs.yaml'
const result = loadData(readFileSync(path, 'utf8'))

if (result.ok) {
  console.log(`${path} is valid: ${result.data.drugs.length} drugs.`)
} else {
  const inGitHubActions = process.env.GITHUB_ACTIONS === 'true'
  for (const error of result.errors) {
    console.log(inGitHubActions ? `::error file=${path}::${error}` : error)
  }
  console.log(`\n${path} has ${result.errors.length} problem(s). Fix them before merging.`)
  process.exitCode = 1
}
```

Run: `npm run validate`
Expected: `drugs.yaml is valid: 14 drugs.`

Run: `sed 's/max: 1$/max: 1,5/' drugs.yaml > /tmp/bad.yaml && npx tsx scripts/validate-data.ts /tmp/bad.yaml; echo "exit $?"`
Expected: lines such as `Adrenaline → dose → max: must be a number (found "1,5")`, then `exit 1`.

- [ ] **Step 11: Typecheck and commit**

Run: `npm run typecheck`
Expected: no output.

```bash
git add drugs.yaml src scripts
git commit -m "Validate drugs.yaml with plain-English errors"
```

---

### Task 4: Infusion maths and number formatting

**Files:**
- Modify: `src/calc/units.ts`
- Create: `src/calc/infusion.ts`, `src/calc/format.ts`
- Test: `src/calc/infusion.test.ts`, `src/calc/format.test.ts`, `src/data/drugs-file.test.ts` (extend)

**Interfaces:**
- Consumes: `Drug`, `AmountUnit`, `DoseUnit` (Task 2); `fixtureDrug` (Task 3).
- Produces:
  - `convertAmount(value: number, from: AmountUnit, to: AmountUnit): number`
  - `doseUnitLabel(unit: DoseUnit): string`, e.g. `"micrograms/kg/min"`
  - `type Infusion = { totalAmount: number; concentrationPerMl: number; rateMlPerHour: number; oneMlPerHour: number; drawUpMl: number; fits: boolean }`
  - `calculateInfusion(drug: Drug, weightKg: number, dose: number): Infusion`
  - `startDoses(drugs: Drug[]): Record<string, number>`
  - `formatNumber(n: number): string`
  - `formatRate(n: number): string`
  - `formatAge(months: number): string`

- [ ] **Step 1: Write the failing tests**

`src/calc/infusion.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { fixture, fixtureDrug } from '../test/fixture'
import { calculateInfusion, startDoses } from './infusion'
import { convertAmount } from './units'

describe('convertAmount', () => {
  it('converts between mass units', () => {
    expect(convertAmount(1, 'mg', 'micrograms')).toBe(1000)
    expect(convertAmount(50, 'micrograms', 'mg')).toBe(0.05)
    expect(convertAmount(1, 'micrograms', 'nanograms')).toBe(1000)
    expect(convertAmount(5, 'units', 'units')).toBe(5)
  })
})

describe('calculateInfusion at 10 kg and the start dose', () => {
  it.each([
    ['Adrenaline', 3, 1, 0.1, 3],
    ['Noradrenaline', 3, 1, 0.1, 3],
    ['Dopamine', 150, 1, 5, 3.75],
    ['Dobutamine', 150, 1, 5, 12],
    ['Milrinone', 15, 1, 0.5, 15],
    ['Morphine', 10, 1, 20, 1],
    ['Fentanyl', 500, 2, 1, 10],
    ['Midazolam', 30, 1, 60, 6],
    ['Ketamine', 500, 1, 1, 10],
    ['Thiopental', 500, 2, 1, 20],
    ['Rocuronium', 100, 1.5, 0.2, 10],
    ['Salbutamol', 30, 1, 1, 30],
    ['Insulin (soluble)', 50, 0.5, 0.1, 0.5],
    ['Dexmedetomidine', 200, 1.25, 0.4, 2],
  ])('%s: total %d, rate %d mL/hr, 1 mL/hr = %d, draw up %d mL', (name, total, rate, oneMl, drawUp) => {
    const drug = fixtureDrug(name)
    const result = calculateInfusion(drug, 10, drug.dose.start)
    expect(result.totalAmount).toBeCloseTo(total, 6)
    expect(result.rateMlPerHour).toBeCloseTo(rate, 6)
    expect(result.oneMlPerHour).toBeCloseTo(oneMl, 6)
    expect(result.drawUpMl).toBeCloseTo(drawUp, 6)
    expect(result.fits).toBe(true)
  })
})

describe('calculateInfusion at other weights', () => {
  it('scales a per-kg syringe with weight', () => {
    const result = calculateInfusion(fixtureDrug('Adrenaline'), 3, 0.1)
    expect(result.totalAmount).toBeCloseTo(0.9, 6)
    expect(result.drawUpMl).toBeCloseTo(0.9, 6)
    expect(result.rateMlPerHour).toBeCloseTo(1, 6)
  })

  it('keeps a fixed syringe the same and scales the rate', () => {
    const at3 = calculateInfusion(fixtureDrug('Dexmedetomidine'), 3, 0.5)
    expect(at3.totalAmount).toBe(200)
    expect(at3.rateMlPerHour).toBeCloseTo(0.375, 6)
    expect(at3.oneMlPerHour).toBeCloseTo(1.33333, 4)
    expect(calculateInfusion(fixtureDrug('Insulin (soluble)'), 30, 0.05).rateMlPerHour).toBeCloseTo(1.5, 6)
  })

  it('doubles the rate when the dose doubles', () => {
    expect(calculateInfusion(fixtureDrug('Adrenaline'), 10, 0.2).rateMlPerHour).toBeCloseTo(2, 6)
  })

  it('flags a syringe that needs more stock than it holds', () => {
    const thiopental = calculateInfusion(fixtureDrug('Thiopental'), 30, 2)
    expect(thiopental.drawUpMl).toBeCloseTo(60, 6)
    expect(thiopental.fits).toBe(false)
    expect(calculateInfusion(fixtureDrug('Salbutamol'), 30, 1).fits).toBe(false)
  })
})

it('startDoses maps each drug id to its start dose', () => {
  const doses = startDoses(fixture.drugs)
  expect(doses[fixtureDrug('Adrenaline').id]).toBe(0.1)
  expect(Object.keys(doses)).toHaveLength(fixture.drugs.length)
})
```

`src/calc/format.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { formatAge, formatNumber, formatRate } from './format'

describe('formatNumber', () => {
  it.each([
    [0.9, '0.9'],
    [0.8999999999999999, '0.9'],
    [3.75, '3.75'],
    [1.33333, '1.33'],
    [11.25, '11.3'],
    [0.0333333, '0.0333'],
    [50, '50'],
    [1500, '1500'],
    [Number.NaN, '–'],
  ])('%d → %s', (value, expected) => {
    expect(formatNumber(value)).toBe(expected)
  })
})

describe('formatRate', () => {
  it.each([
    [1, '1.0'],
    [12.34, '12.3'],
    [0.5, '0.50'],
    [0.375, '0.38'],
    [0.004, '< 0.01'],
    [0, '0.00'],
    [Number.POSITIVE_INFINITY, '–'],
  ])('%d → %s', (value, expected) => {
    expect(formatRate(value)).toBe(expected)
  })
})

describe('formatAge', () => {
  it.each([
    [0, '0 months'],
    [1, '1 month'],
    [12, '1 year'],
    [13, '1 year 1 month'],
    [42, '3 years 6 months'],
  ])('%d months → %s', (months, expected) => {
    expect(formatAge(months)).toBe(expected)
  })
})
```

Append to `src/data/drugs-file.test.ts`:
```ts
import { calculateInfusion } from '../calc/infusion'

it('every drug in drugs.yaml gives a finite rate at 3, 10 and 30 kg', () => {
  const result = loadData(raw)
  if (!result.ok) throw new Error(result.errors.join('\n'))
  for (const drug of result.data.drugs) {
    for (const weightKg of [3, 10, 30]) {
      const rate = calculateInfusion(drug, weightKg, drug.dose.start).rateMlPerHour
      expect(Number.isFinite(rate) && rate > 0, `${drug.name} at ${weightKg} kg`).toBe(true)
    }
  }
})
```
(Move the new `import` to the top of the file with the others.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/calc src/data/drugs-file.test.ts`
Expected: FAIL, missing `./infusion`, `./format`, `convertAmount`.

- [ ] **Step 3: Implement**

`src/calc/units.ts` (replace the file):
```ts
import type { AmountUnit, DoseUnit } from '../data/types'

const IN_SMALLEST_UNIT: Record<AmountUnit, number> = { nanograms: 1, micrograms: 1e3, mg: 1e6, units: 1 }

export const unitFamily = (unit: AmountUnit): 'mass' | 'units' => (unit === 'units' ? 'units' : 'mass')

export const convertAmount = (value: number, from: AmountUnit, to: AmountUnit): number =>
  (value * IN_SMALLEST_UNIT[from]) / IN_SMALLEST_UNIT[to]

export const doseUnitLabel = (unit: DoseUnit): string => `${unit.unit}/kg/${unit.per}`
```

`src/calc/infusion.ts`:
```ts
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
```

`src/calc/format.ts`:
```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/calc src/data`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/calc src/data/drugs-file.test.ts
git commit -m "Calculate infusion rates, draw-up volumes and display rounding"
```

---

### Task 5: Age input, weight estimate and weight checks

**Files:**
- Create: `src/calc/patient.ts`, `src/calc/estimate.ts`, `src/calc/weightCheck.ts`
- Test: `src/calc/patient.test.ts`, `src/calc/estimate.test.ts`, `src/calc/weightCheck.test.ts`

**Interfaces:**
- Consumes: `AppData`, `WeightBand`, `Age` (Task 2); `formatNumber` (Task 4); `fixture` (Task 3).
- Produces:
  - `type AgeInput = { kind: 'none' } | { kind: 'age'; months: number } | { kind: 'error'; message: string }`
  - `parseAgeInput(years: string, months: string): AgeInput`
  - `parseDecimalInput(text: string): number | null` (accepts "14,5")
  - `type PatientInput = { ageMonths: number | null; weightKg: number | null; estimated: boolean }`
  - `findWeightBand(bands: WeightBand[], ageMonths: number): WeightBand | null`
  - `estimateWeight(bands: WeightBand[], ageMonths: number): number | null` (1 dp)
  - `bandRangeText(bands: WeightBand[]): string`, e.g. `"1–13 years"`
  - `formulaText(band: WeightBand): string`, e.g. `"(3 × age in years) + 7"`
  - `type Safeguarding = { weightKg: number; expectedKg: number; message: string }`
  - `type WeightCheck = { ok: false; message: string } | { ok: true; notes: string[]; safeguarding: Safeguarding | null }`
  - `checkWeight(patient: PatientInput, data: CheckData): WeightCheck`, where `CheckData = Pick<AppData, 'weightLimits' | 'weightForAgeChecks' | 'weightFromAge'>`
  - `safeguardingDetail(s: Safeguarding): string`
  - `type Submission = PatientInput & { check: WeightCheck }`
  - `validWeight(submission: Submission | null): number | null`

- [ ] **Step 1: Write the failing tests**

`src/calc/patient.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { parseAgeInput, parseDecimalInput } from './patient'

describe('parseAgeInput', () => {
  it('treats two empty boxes as no age', () => {
    expect(parseAgeInput('', ' ')).toEqual({ kind: 'none' })
  })

  it.each([
    ['3', '', 36],
    ['3', '6', 42],
    ['', '8', 8],
    ['', '30', 30],
    ['18', '0', 216],
  ])('%s years %s months → %d months', (years, months, expected) => {
    expect(parseAgeInput(years, months)).toEqual({ kind: 'age', months: expected })
  })

  it.each([
    ['2.5', '', 'Enter age as whole years and months.'],
    ['-1', '', 'Enter age as whole years and months.'],
    ['3', '12', 'Months should be 0–11 when years are entered.'],
    ['18', '1', 'Age is over 18 years. Check the age.'],
  ])('%s years %s months is an error', (years, months, message) => {
    expect(parseAgeInput(years, months)).toEqual({ kind: 'error', message })
  })
})

describe('parseDecimalInput', () => {
  it.each([
    ['14', 14],
    ['14.5', 14.5],
    ['14,5', 14.5],
    [' 0.8 ', 0.8],
    ['.5', 0.5],
    ['14.', 14],
  ])('%j → %d', (text, expected) => {
    expect(parseDecimalInput(text)).toBe(expected)
  })

  it.each(['', 'abc', '1.2.3', '-3', '1e3'])('%j → null', text => {
    expect(parseDecimalInput(text)).toBeNull()
  })
})
```

`src/calc/estimate.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { fixture } from '../test/fixture'
import { bandRangeText, estimateWeight, findWeightBand, formulaText } from './estimate'

const bands = fixture.weightFromAge

describe('estimateWeight', () => {
  it.each([
    [11, null],
    [12, 10],
    [23, 10],
    [42, 16],
    [167, 46],
    [168, null],
  ])('%d months → %s kg', (months, expected) => {
    expect(estimateWeight(bands, months)).toBe(expected)
  })

  it('uses months when the band says so', () => {
    const monthBand = { ...bands[0], ageIn: 'months' as const, fromMonths: 0, toMonthsExclusive: 12, multiplyBy: 0.5, thenAddKg: 4 }
    expect(estimateWeight([monthBand], 6)).toBe(7)
  })
})

describe('band text', () => {
  it('describes the range and formula', () => {
    expect(bandRangeText(bands)).toBe('1–13 years')
    expect(formulaText(bands[0])).toBe('(3 × age in years) + 7')
    expect(findWeightBand(bands, 12)?.name).toBe('UK resuscitation formula')
  })

  it('names both units when they differ', () => {
    const mixed = { ...bands[0], fromAge: { value: 6, unit: 'month' as const } }
    expect(bandRangeText([mixed])).toBe('6 months–13 years')
  })
})
```

`src/calc/weightCheck.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { fixture } from '../test/fixture'
import { checkWeight, safeguardingDetail } from './weightCheck'

const measured = (weightKg: number | null, ageMonths: number | null = null) =>
  checkWeight({ weightKg, ageMonths, estimated: false }, fixture)

describe('checkWeight limits', () => {
  it('asks for a weight when there is none', () => {
    expect(measured(null)).toEqual({ ok: false, message: "Enter the child's weight in kg." })
  })

  it.each([0.2, 151])('blocks %d kg', weightKg => {
    expect(measured(weightKg)).toEqual({
      ok: false,
      message: `${weightKg} kg is not a possible weight. Enter a weight between 0.3 and 150 kg.`,
    })
  })

  it.each([0.4, 85])('warns about %d kg but allows it', weightKg => {
    expect(measured(weightKg)).toEqual({
      ok: true,
      notes: [`${weightKg} kg is outside the usual 0.5–80 kg range. Check the weight.`],
      safeguarding: null,
    })
  })
})

describe('checkWeight against age (1 year, expected 10 kg)', () => {
  it('says nothing within 25%', () => {
    expect(measured(12.5, 12)).toEqual({ ok: true, notes: [], safeguarding: null })
  })

  it('adds a check note beyond 25%', () => {
    expect(measured(13, 12)).toEqual({
      ok: true,
      notes: ['13 kg is higher than expected for this age (about 10 kg). Check the weight and age.'],
      safeguarding: null,
    })
    expect(measured(6, 12)).toMatchObject({ notes: ['6 kg is lower than expected for this age (about 10 kg). Check the weight and age.'] })
    expect(measured(16, 12)).toMatchObject({ safeguarding: null })
  })

  it('raises safeguarding beyond 60% above or 40% below', () => {
    expect(measured(16.1, 12)).toEqual({
      ok: true,
      notes: [],
      safeguarding: { weightKg: 16.1, expectedKg: 10, message: fixture.weightForAgeChecks.messageAbove },
    })
    expect(measured(5.9, 12)).toMatchObject({ safeguarding: { message: fixture.weightForAgeChecks.messageBelow } })
  })

  it('skips age checks for an estimated weight', () => {
    expect(checkWeight({ weightKg: 5.9, ageMonths: 12, estimated: true }, fixture)).toEqual({
      ok: true,
      notes: [],
      safeguarding: null,
    })
  })

  it('skips age checks outside every band', () => {
    expect(measured(5.9, 200)).toEqual({ ok: true, notes: [], safeguarding: null })
  })

  it('describes the safeguarding flag', () => {
    expect(safeguardingDetail({ weightKg: 17, expectedKg: 10, message: '' })).toBe(
      '17 kg entered. Expected for age: about 10 kg.',
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/calc`
Expected: FAIL, missing `./patient`, `./estimate`, `./weightCheck`.

- [ ] **Step 3: Implement**

`src/calc/patient.ts`:
```ts
export type AgeInput = { kind: 'none' } | { kind: 'age'; months: number } | { kind: 'error'; message: string }

export type PatientInput = { ageMonths: number | null; weightKg: number | null; estimated: boolean }

const WHOLE = /^\d+$/
const DECIMAL = /^(\d+(\.\d*)?|\.\d+)$/
const MAX_AGE_MONTHS = 216

export const parseAgeInput = (years: string, months: string): AgeInput => {
  const yearText = years.trim()
  const monthText = months.trim()
  if (yearText === '' && monthText === '') return { kind: 'none' }
  const badYears = yearText !== '' && !WHOLE.test(yearText)
  const badMonths = monthText !== '' && !WHOLE.test(monthText)
  if (badYears || badMonths) return { kind: 'error', message: 'Enter age as whole years and months.' }
  const yearCount = yearText === '' ? 0 : Number(yearText)
  const monthCount = monthText === '' ? 0 : Number(monthText)
  if (yearText !== '' && monthCount > 11) {
    return { kind: 'error', message: 'Months should be 0–11 when years are entered.' }
  }
  const total = yearCount * 12 + monthCount
  if (total > MAX_AGE_MONTHS) return { kind: 'error', message: 'Age is over 18 years. Check the age.' }
  return { kind: 'age', months: total }
}

export const parseDecimalInput = (text: string): number | null => {
  const normalised = text.trim().replace(',', '.')
  return DECIMAL.test(normalised) ? Number(normalised) : null
}
```

`src/calc/estimate.ts`:
```ts
import type { Age, WeightBand } from '../data/types'

export const findWeightBand = (bands: WeightBand[], ageMonths: number): WeightBand | null =>
  bands.find(band => ageMonths >= band.fromMonths && ageMonths < band.toMonthsExclusive) ?? null

export const estimateWeight = (bands: WeightBand[], ageMonths: number): number | null => {
  const band = findWeightBand(bands, ageMonths)
  if (!band) return null
  const age = band.ageIn === 'years' ? Math.floor(ageMonths / 12) : ageMonths
  return Math.round((band.multiplyBy * age + band.thenAddKg) * 10) / 10
}

const unitWord = (age: Age) => `${age.unit}${age.value === 1 ? '' : 's'}`

const rangeText = (band: WeightBand) =>
  band.fromAge.unit === band.toAge.unit
    ? `${band.fromAge.value}–${band.toAge.value} ${unitWord(band.toAge)}`
    : `${band.fromAge.value} ${unitWord(band.fromAge)}–${band.toAge.value} ${unitWord(band.toAge)}`

export const bandRangeText = (bands: WeightBand[]): string => bands.map(rangeText).join(' or ')

export const formulaText = (band: WeightBand): string => `(${band.multiplyBy} × age in ${band.ageIn}) + ${band.thenAddKg}`
```

`src/calc/weightCheck.ts`:
```ts
import type { AppData } from '../data/types'
import { estimateWeight } from './estimate'
import { formatNumber } from './format'
import type { PatientInput } from './patient'

export type Safeguarding = { weightKg: number; expectedKg: number; message: string }

export type WeightCheck = { ok: false; message: string } | { ok: true; notes: string[]; safeguarding: Safeguarding | null }

export type Submission = PatientInput & { check: WeightCheck }

type CheckData = Pick<AppData, 'weightLimits' | 'weightForAgeChecks' | 'weightFromAge'>

export const checkWeight = (patient: PatientInput, data: CheckData): WeightCheck => {
  const { weightKg } = patient
  const limits = data.weightLimits
  if (weightKg === null) return { ok: false, message: "Enter the child's weight in kg." }
  const kg = formatNumber(weightKg)
  if (weightKg < limits.blockBelowKg || weightKg > limits.blockAboveKg) {
    return {
      ok: false,
      message: `${kg} kg is not a possible weight. Enter a weight between ${formatNumber(limits.blockBelowKg)} and ${formatNumber(limits.blockAboveKg)} kg.`,
    }
  }
  const notes: string[] = []
  if (weightKg < limits.warnBelowKg || weightKg > limits.warnAboveKg) {
    notes.push(`${kg} kg is outside the usual ${formatNumber(limits.warnBelowKg)}–${formatNumber(limits.warnAboveKg)} kg range. Check the weight.`)
  }
  const ageMonths = patient.estimated ? null : patient.ageMonths
  const expectedKg = ageMonths === null ? null : estimateWeight(data.weightFromAge, ageMonths)
  if (expectedKg === null) return { ok: true, notes, safeguarding: null }
  const checks = data.weightForAgeChecks
  const differsByPercent = ((weightKg - expectedKg) * 100) / expectedKg
  if (-differsByPercent > checks.safeguardingBelowPercent) {
    return { ok: true, notes, safeguarding: { weightKg, expectedKg, message: checks.messageBelow } }
  }
  if (differsByPercent > checks.safeguardingAbovePercent) {
    return { ok: true, notes, safeguarding: { weightKg, expectedKg, message: checks.messageAbove } }
  }
  if (Math.abs(differsByPercent) > checks.checkPercent) {
    const direction = differsByPercent > 0 ? 'higher' : 'lower'
    notes.push(`${kg} kg is ${direction} than expected for this age (about ${formatNumber(expectedKg)} kg). Check the weight and age.`)
  }
  return { ok: true, notes, safeguarding: null }
}

export const safeguardingDetail = (safeguarding: Safeguarding): string =>
  `${formatNumber(safeguarding.weightKg)} kg entered. Expected for age: about ${formatNumber(safeguarding.expectedKg)} kg.`

export const validWeight = (submission: Submission | null): number | null =>
  submission !== null && submission.check.ok ? submission.weightKg : null
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/calc && npm run typecheck`
Expected: PASS; no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/calc
git commit -m "Estimate weight from age and check weights against limits and age"
```

---

### Task 6: Styles, disclaimer and banner

**Files:**
- Create: `src/styles.css`, `src/components/Disclaimer.tsx`, `src/components/Banner.tsx`
- Test: `src/components/Disclaimer.test.tsx`, `src/components/Banner.test.tsx`

**Interfaces:**
- Consumes: `AppData['disclaimer']` (Task 2); `fixture` (Task 3).
- Produces:
  - `Disclaimer({ disclaimer, onAcknowledge }: { disclaimer: AppData['disclaimer']; onAcknowledge: () => void })`
  - `Banner({ text }: { text: string })`
  - CSS classes used by Tasks 7 to 9.

- [ ] **Step 1: Create `src/styles.css`**

```css
:root {
  --bg: #EEF2F5;
  --surface: #FFFFFF;
  --ink: #13202A;
  --muted: #56666F;
  --line: #D5DDE3;
  --accent: #0B5C8C;
  --accent-soft: #E1EEF6;
  --warn: #9A5B00;
  --warn-soft: #FFF1D6;
  --danger: #B0261C;
  --danger-soft: #FCE4E1;
  --flag-bg: #B3261E;
  --flag-ink: #FFFFFF;
  --iso-vaso: #CDAEE3;
  --iso-opioid: #9FD4F2;
  --iso-benzo: #F7A94F;
  --iso-induction: #F5E04A;
  --iso-nmb: #FF5B4F;
  --iso-other: #FFFFFF;
  --font-body: Roboto, Arial, "Helvetica Neue", sans-serif;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #0C1319; --surface: #141E26; --ink: #E4ECF1; --muted: #93A4B0; --line: #283742;
    --accent: #62B4EA; --accent-soft: #16303F; --warn: #F2A93B; --warn-soft: #33260F;
    --danger: #FF7A6E; --danger-soft: #3A1A18; --flag-bg: #C62E25; --flag-ink: #FFFFFF; color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --bg: #0C1319; --surface: #141E26; --ink: #E4ECF1; --muted: #93A4B0; --line: #283742;
  --accent: #62B4EA; --accent-soft: #16303F; --warn: #F2A93B; --warn-soft: #33260F;
  --danger: #FF7A6E; --danger-soft: #3A1A18; --flag-bg: #C62E25; --flag-ink: #FFFFFF; color-scheme: dark;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font-family: var(--font-body); font-size: 16px; line-height: 1.5; }
button:focus-visible, input:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }

.proto-banner { background: var(--warn-soft); color: var(--warn); font-size: 13px; font-weight: 600; text-align: center; padding: 6px 16px; border-bottom: 1px solid var(--line); }

.disclaimer-backdrop { position: fixed; inset: 0; z-index: 20; display: grid; place-items: center; padding: 16px; background: rgb(8 14 20 / 0.72); }
.disclaimer { width: min(560px, 100%); max-height: 100%; overflow: auto; border-radius: 12px; background: var(--surface); color: var(--ink); box-shadow: 0 20px 48px rgb(0 0 0 / 0.3); }
.disc-head { background: var(--accent-soft); border-bottom: 1px solid var(--line); padding: 20px 24px; }
.disc-head h2 { margin: 0; font-size: 28px; font-weight: 600; }
.disc-body { padding: 20px 24px; display: grid; gap: 10px; font-size: 17px; line-height: 1.6; color: var(--muted); }
.disc-body p { margin: 0; }
.disc-heading { font-weight: 700; }
.disc-foot { background: var(--bg); border-top: 1px solid var(--line); padding: 18px 24px; }
.disc-foot button { font: 600 17px var(--font-body); min-height: 48px; padding: 0 24px; border: 0; border-radius: 8px; background: var(--accent); color: var(--surface); cursor: pointer; }

header.bar { background: var(--surface); border-bottom: 1px solid var(--line); }
.bar-inner { max-width: 1120px; margin: 0 auto; padding: 10px 16px 12px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.brand { font-size: 13px; color: var(--muted); text-align: center; }
.brand strong { color: var(--ink); font-weight: 700; }

.patient { width: 100%; max-width: 440px; display: grid; }
.prow { display: grid; grid-template-columns: 72px 1fr; align-items: center; gap: 12px; padding-block: 12px; }
.prow + .prow { border-top: 1px solid var(--line); }
.plabel { font-size: 18px; font-weight: 600; text-align: right; }
.pfields { display: flex; align-items: center; flex-wrap: wrap; gap: 10px 18px; }
.pf { display: inline-flex; align-items: center; gap: 8px; font-size: 17px; }
.pf input { width: 4.2em; height: 48px; font: 600 22px var(--font-body); text-align: center; font-variant-numeric: tabular-nums; border: 2px solid var(--line); border-radius: 8px; background: var(--bg); color: var(--ink); }
.pf input:focus { border-color: var(--accent); outline: none; box-shadow: 0 0 0 3px var(--accent-soft); }
.pf input.invalid { border-color: var(--danger); }
.pf input[readonly] { border-style: dashed; color: var(--warn); }
.est { display: inline-flex; align-items: center; gap: 10px; font-size: 16px; line-height: 1.2; cursor: pointer; }
.est input { width: 24px; height: 24px; accent-color: var(--accent); cursor: pointer; }
.est-hint { grid-column: 2; margin: 0; font-size: 13px; color: var(--muted); }
.est-hint:empty { display: none; }
.weight-msg { font-size: 13px; font-weight: 600; color: var(--danger); text-align: left; padding: 0 0 8px 84px; }
.weight-msg:empty { display: none; }
.psubmit { display: flex; justify-content: flex-end; padding-bottom: 4px; }
.psubmit button { font: 600 17px var(--font-body); height: 48px; padding: 0 28px; border: 0; border-radius: 8px; background: var(--accent); color: var(--surface); cursor: pointer; }
@media (max-width: 400px) { .prow { grid-template-columns: 60px 1fr; gap: 8px; } .weight-msg { padding-left: 0; } }

.wrap { max-width: 1120px; margin: 0 auto; padding: 20px 16px 48px; }
.sheet-meta { max-width: 760px; margin: 0 0 14px; padding: 12px 16px; background: var(--surface); border: 2px solid var(--accent); border-radius: 10px; color: var(--muted); font-size: 17px; display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; }
.sheet-meta b { color: var(--ink); font: 700 20px var(--font-body); font-variant-numeric: tabular-nums; }
.sheet-meta.stale { color: var(--warn); font-weight: 600; border-color: var(--warn); }
.weight-src { align-self: center; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; padding: 2px 8px; border-radius: 999px; background: var(--warn-soft); color: var(--warn); }

.sg-flag { display: flex; gap: 12px; align-items: flex-start; max-width: 760px; margin-bottom: 14px; padding: 12px 14px; border-radius: 10px; background: var(--flag-bg); color: var(--flag-ink); }
.sg-flag strong { font-size: 17px; }
.sg-flag p { margin: 2px 0 0; font-size: 15px; }
.sg-icon { flex: none; width: 26px; height: 26px; border-radius: 50%; background: var(--flag-ink); color: var(--flag-bg); display: grid; place-items: center; font-weight: 700; }

.results { position: relative; max-width: 760px; }
.list { display: grid; gap: 18px; }
.list.stale { opacity: 0.4; }
.list.masked { filter: blur(7px); opacity: 0.35; user-select: none; }
.mask { position: absolute; inset: 0; padding-top: 8px; }
.mask-card { position: sticky; top: 16px; max-width: 520px; margin-inline: auto; background: var(--surface); border: 2px solid var(--flag-bg); border-radius: 12px; overflow: hidden; box-shadow: 0 12px 32px rgb(0 0 0 / 0.18); }
.mask-head { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: var(--flag-bg); color: var(--flag-ink); font-size: 18px; }
.mask-body { padding: 14px 16px 4px; display: grid; gap: 8px; font-size: 15px; }
.mask-body p { margin: 0; }
.mask-body .kg { font: 700 18px var(--font-body); }
.mask-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 10px; padding: 14px 16px 16px; }
.mask-actions button { font: 600 16px var(--font-body); min-height: 48px; padding: 0 18px; border-radius: 8px; cursor: pointer; }
.btn-secondary { background: var(--surface); color: var(--ink); border: 2px solid var(--line); }
.btn-flag { background: var(--flag-bg); color: var(--flag-ink); border: 2px solid var(--flag-bg); }
@media (max-width: 480px) { .mask-actions button { flex: 1 1 100%; } }

.grp { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
.grp-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin: 0 0 6px 2px; display: flex; align-items: center; gap: 8px; }
.swatch { width: 14px; height: 14px; border-radius: 3px; border: 1px solid var(--line); flex: none; }
.row + .row { border-top: 1px solid var(--line); }
.row-head { width: 100%; display: grid; grid-template-columns: 1fr auto 18px; align-items: center; gap: 12px; padding: 12px 14px; min-height: 60px; background: none; border: 0; color: var(--ink); text-align: left; cursor: pointer; font: inherit; }
.row-head:hover { background: var(--bg); }
.rname { font-weight: 500; font-size: 17px; line-height: 1.25; min-width: 0; }
.rname small, .rrate small { display: block; font-size: 13px; font-weight: 400; color: var(--muted); }
.rrate { text-align: right; white-space: nowrap; }
.rrate b { font-size: 22px; font-variant-numeric: tabular-nums; }
.rrate b.no-fit { font-size: 15px; color: var(--danger); }
.rrate .u { font-size: 13px; color: var(--muted); }
.rrate.adjusted b { color: var(--accent); }
.rrate small.flag { color: var(--danger); }
.chev { width: 10px; height: 10px; border-right: 2px solid var(--muted); border-bottom: 2px solid var(--muted); transform: rotate(45deg); justify-self: center; margin-top: -4px; }
.row-head[aria-expanded="true"] .chev { transform: rotate(-135deg); margin-top: 4px; }
.row-body { padding: 4px 14px 16px; display: grid; gap: 12px; font-size: 15px; }
.instr { background: var(--accent-soft); border-radius: 8px; padding: 12px 14px; }
.rule { color: var(--muted); }
.rule b { color: var(--ink); }
.dose-input { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.dose-input input { width: 7ch; font: 600 22px var(--font-body); padding: 4px 8px; border: 1px solid var(--line); border-radius: 6px; background: var(--bg); color: var(--ink); font-variant-numeric: tabular-nums; }
.dose-input span { color: var(--muted); }
.step-btn { width: 44px; height: 44px; border-radius: 50%; border: 1px solid var(--line); background: var(--bg); color: var(--ink); font: 600 22px/1 var(--font-body); cursor: pointer; display: grid; place-items: center; touch-action: manipulation; }
.step-btn:active { background: var(--accent-soft); }
.alert { border-radius: 8px; padding: 10px 14px; font-weight: 600; }
.alert.warn { background: var(--warn-soft); color: var(--warn); }
.alert.danger { background: var(--danger-soft); color: var(--danger); }
.notes { color: var(--muted); border-top: 1px dashed var(--line); padding-top: 12px; }

footer { margin-top: 32px; font-size: 13px; color: var(--muted); }
@media (prefers-reduced-motion: no-preference) { .chev { transition: transform 0.15s; } }
```

- [ ] **Step 2: Write the failing tests**

`src/components/Disclaimer.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { fixture } from '../test/fixture'
import { Disclaimer } from './Disclaimer'

it('shows the wording from the data and focuses the button', () => {
  render(<Disclaimer disclaimer={fixture.disclaimer} onAcknowledge={() => {}} />)
  expect(screen.getByRole('dialog', { name: 'Please read' })).toBeInTheDocument()
  expect(screen.getByText('Disclaimer:')).toBeInTheDocument()
  expect(screen.getByText('A second paragraph can go here if needed.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'I understand' })).toHaveFocus()
})

it('calls onAcknowledge from the button only', async () => {
  const onAcknowledge = vi.fn()
  render(<Disclaimer disclaimer={fixture.disclaimer} onAcknowledge={onAcknowledge} />)
  await userEvent.keyboard('{Escape}')
  expect(onAcknowledge).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'I understand' }))
  expect(onAcknowledge).toHaveBeenCalledOnce()
})
```

`src/components/Banner.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { Banner } from './Banner'

it('shows the banner text', () => {
  render(<Banner text="Prototype only. Not for clinical use." />)
  expect(screen.getByText('Prototype only. Not for clinical use.')).toBeInTheDocument()
})

it('renders nothing for empty text', () => {
  const { container } = render(<Banner text="" />)
  expect(container).toBeEmptyDOMElement()
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/components`
Expected: FAIL, missing components.

- [ ] **Step 4: Implement**

`src/components/Disclaimer.tsx`:
```tsx
import { useEffect, useRef } from 'react'
import type { AppData } from '../data/types'

type Props = { disclaimer: AppData['disclaimer']; onAcknowledge: () => void }

export const Disclaimer = ({ disclaimer, onAcknowledge }: Props) => {
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    buttonRef.current?.focus()
  }, [])

  return (
    <div className="disclaimer-backdrop">
      <div className="disclaimer" role="dialog" aria-modal="true" aria-labelledby="disclaimer-title">
        <div className="disc-head">
          <h2 id="disclaimer-title">{disclaimer.title}</h2>
        </div>
        <div className="disc-body">
          <p className="disc-heading">{disclaimer.heading}</p>
          {disclaimer.paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
        <div className="disc-foot">
          <button type="button" ref={buttonRef} onClick={onAcknowledge}>
            {disclaimer.button}
          </button>
        </div>
      </div>
    </div>
  )
}
```

`src/components/Banner.tsx`:
```tsx
type Props = { text: string }

export const Banner = ({ text }: Props) => (text === '' ? null : <div className="proto-banner">{text}</div>)
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/styles.css src/components
git commit -m "Add styles, disclaimer and prototype banner"
```

---

### Task 7: Patient form

**Files:**
- Create: `src/components/PatientForm.tsx`
- Test: `src/components/PatientForm.test.tsx`

**Interfaces:**
- Consumes: `parseAgeInput`, `parseDecimalInput`, `PatientInput` (Task 5); `findWeightBand`, `estimateWeight`, `bandRangeText`, `formulaText` (Task 5); `WeightCheck` (Task 5); `WeightBand` (Task 2).
- Produces: `PatientForm(props: { bands: WeightBand[]; check: WeightCheck | null; weightInputRef: RefObject<HTMLInputElement | null>; onSubmit: (patient: PatientInput) => void; onEdit: () => void })`. Accessible names: "Age, years", "Age, months", "Weight", "estimate weight", button "Submit".

- [ ] **Step 1: Write the failing tests**

`src/components/PatientForm.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fixture } from '../test/fixture'
import { PatientForm } from './PatientForm'

const setup = (check: Parameters<typeof PatientForm>[0]['check'] = null) => {
  const onSubmit = vi.fn()
  const onEdit = vi.fn()
  render(
    <PatientForm
      bands={fixture.weightFromAge}
      check={check}
      weightInputRef={createRef<HTMLInputElement>()}
      onSubmit={onSubmit}
      onEdit={onEdit}
    />,
  )
  return {
    onSubmit,
    onEdit,
    years: screen.getByLabelText('Age, years'),
    months: screen.getByLabelText('Age, months'),
    weight: screen.getByLabelText('Weight'),
  }
}

describe('estimate weight', () => {
  it('is hidden without a covered age, with a hint', async () => {
    const { months } = setup()
    expect(screen.queryByLabelText('estimate weight')).not.toBeInTheDocument()
    expect(screen.getByText('Enter an age of 1–13 years to estimate weight.')).toBeInTheDocument()
    await userEvent.type(months, '11')
    expect(screen.queryByLabelText('estimate weight')).not.toBeInTheDocument()
  })

  it('fills and locks the weight when ticked', async () => {
    const { years, weight } = setup()
    await userEvent.type(years, '1')
    await userEvent.click(screen.getByLabelText('estimate weight'))
    expect(weight).toHaveValue('10')
    expect(weight).toHaveAttribute('readonly')
    expect(screen.getByText('UK resuscitation formula: (3 × age in years) + 7.')).toBeInTheDocument()
  })

  it('unticks and clears the weight when the age leaves the range', async () => {
    const { years, weight } = setup()
    await userEvent.type(years, '1')
    await userEvent.click(screen.getByLabelText('estimate weight'))
    await userEvent.type(years, '4')
    expect(screen.queryByLabelText('estimate weight')).not.toBeInTheDocument()
    expect(weight).toHaveValue('')
    expect(weight).not.toHaveAttribute('readonly')
  })
})

describe('submit', () => {
  it('sends the age in months and a comma-decimal weight', async () => {
    const { years, months, weight, onSubmit } = setup()
    await userEvent.type(years, '3')
    await userEvent.type(months, '6')
    await userEvent.type(weight, '14,5')
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }))
    expect(onSubmit).toHaveBeenCalledWith({ ageMonths: 42, weightKg: 14.5, estimated: false })
  })

  it('submits on Enter', async () => {
    const { weight, onSubmit } = setup()
    await userEvent.type(weight, '14{Enter}')
    expect(onSubmit).toHaveBeenCalledWith({ ageMonths: null, weightKg: 14, estimated: false })
  })

  it('sends an estimated weight', async () => {
    const { years, onSubmit } = setup()
    await userEvent.type(years, '1')
    await userEvent.click(screen.getByLabelText('estimate weight'))
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }))
    expect(onSubmit).toHaveBeenCalledWith({ ageMonths: 12, weightKg: 10, estimated: true })
  })

  it('shows an age error and does not submit', async () => {
    const { years, months, weight, onSubmit } = setup()
    await userEvent.type(years, '3')
    await userEvent.type(months, '12')
    await userEvent.type(weight, '14')
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }))
    expect(screen.getByText('Months should be 0–11 when years are entered.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('reports every edit', async () => {
    const { weight, onEdit } = setup()
    await userEvent.type(weight, '1')
    expect(onEdit).toHaveBeenCalled()
  })
})

it('shows the weight check message and marks the box invalid', () => {
  const { weight } = setup({ ok: false, message: '200 kg is not a possible weight.' })
  expect(screen.getByText('200 kg is not a possible weight.')).toBeInTheDocument()
  expect(weight).toHaveAttribute('aria-invalid', 'true')
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/PatientForm.test.tsx`
Expected: FAIL, missing `./PatientForm`.

- [ ] **Step 3: Implement `src/components/PatientForm.tsx`**

```tsx
import { type FormEvent, type RefObject, useState } from 'react'
import { bandRangeText, estimateWeight, findWeightBand, formulaText } from '../calc/estimate'
import { type PatientInput, parseAgeInput, parseDecimalInput } from '../calc/patient'
import type { WeightCheck } from '../calc/weightCheck'
import type { WeightBand } from '../data/types'

type Props = {
  bands: WeightBand[]
  check: WeightCheck | null
  weightInputRef: RefObject<HTMLInputElement | null>
  onSubmit: (patient: PatientInput) => void
  onEdit: () => void
}

const estimateFor = (bands: WeightBand[], years: string, months: string): number | null => {
  const age = parseAgeInput(years, months)
  return age.kind === 'age' ? estimateWeight(bands, age.months) : null
}

const hintText = (bands: WeightBand[], band: WeightBand | null, estimate: boolean): string => {
  if (bands.length === 0) return ''
  if (band === null) return `Enter an age of ${bandRangeText(bands)} to estimate weight.`
  if (estimate) return `${band.name}: ${formulaText(band)}.`
  return ''
}

const messageText = (ageError: string | null, check: WeightCheck | null): string => {
  if (ageError !== null) return ageError
  if (check === null) return ''
  if (!check.ok) return check.message
  return check.notes.join(' ')
}

export const PatientForm = ({ bands, check, weightInputRef, onSubmit, onEdit }: Props) => {
  const [years, setYears] = useState('')
  const [months, setMonths] = useState('')
  const [weight, setWeight] = useState('')
  const [estimate, setEstimate] = useState(false)
  const [ageError, setAgeError] = useState<string | null>(null)

  const age = parseAgeInput(years, months)
  const ageMonths = age.kind === 'age' ? age.months : null
  const band = ageMonths === null ? null : findWeightBand(bands, ageMonths)
  const estimateKg = estimateFor(bands, years, months)
  const shownWeight = estimate && estimateKg !== null ? String(estimateKg) : weight
  const weightInvalid = check !== null && !check.ok

  const changeAge = (nextYears: string, nextMonths: string) => {
    setYears(nextYears)
    setMonths(nextMonths)
    if (estimate && estimateFor(bands, nextYears, nextMonths) === null) {
      setEstimate(false)
      setWeight('')
    }
    onEdit()
  }

  const toggleEstimate = (checked: boolean) => {
    setEstimate(checked)
    setWeight('')
    onEdit()
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (age.kind === 'error') {
      setAgeError(age.message)
      return
    }
    setAgeError(null)
    onSubmit({ ageMonths, weightKg: parseDecimalInput(shownWeight), estimated: estimate })
  }

  return (
    <form className="patient" noValidate onSubmit={submit}>
      <div className="prow">
        <label className="plabel" htmlFor="age-years">
          Age
        </label>
        <div className="pfields">
          <span className="pf">
            <input
              id="age-years"
              inputMode="numeric"
              aria-label="Age, years"
              aria-invalid={ageError !== null}
              className={ageError === null ? undefined : 'invalid'}
              value={years}
              onChange={event => changeAge(event.target.value, months)}
            />
            <span>years</span>
          </span>
          <span className="pf">
            <input
              id="age-months"
              inputMode="numeric"
              aria-label="Age, months"
              aria-invalid={ageError !== null}
              className={ageError === null ? undefined : 'invalid'}
              value={months}
              onChange={event => changeAge(years, event.target.value)}
            />
            <span>months</span>
          </span>
        </div>
      </div>
      <div className="prow">
        <label className="plabel" htmlFor="weight">
          Weight
        </label>
        <div className="pfields">
          <span className="pf">
            <input
              id="weight"
              ref={weightInputRef}
              inputMode="decimal"
              aria-invalid={weightInvalid}
              className={weightInvalid ? 'invalid' : undefined}
              readOnly={estimate}
              value={shownWeight}
              onChange={event => {
                setWeight(event.target.value)
                onEdit()
              }}
            />
            <span>kg</span>
          </span>
          {band === null ? null : (
            <label className="est">
              estimate weight
              <input
                type="checkbox"
                checked={estimate}
                aria-describedby="est-hint"
                onChange={event => toggleEstimate(event.target.checked)}
              />
            </label>
          )}
        </div>
        <p className="est-hint" id="est-hint">
          {hintText(bands, band, estimate)}
        </p>
      </div>
      <div className="weight-msg" aria-live="polite">
        {messageText(ageError, check)}
      </div>
      <div className="psubmit">
        <button type="submit">Submit</button>
      </div>
    </form>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/PatientForm.test.tsx && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/PatientForm.tsx src/components/PatientForm.test.tsx
git commit -m "Add patient form with age, weight and weight estimate"
```

---

### Task 8: Results summary and drug list

**Files:**
- Create: `src/components/ResultsSummary.tsx`, `src/components/DrugList.tsx`, `src/components/DrugRow.tsx`, `src/components/DoseInput.tsx`
- Test: `src/components/ResultsSummary.test.tsx`, `src/components/DrugList.test.tsx`

**Interfaces:**
- Consumes: `calculateInfusion`, `startDoses`, `Infusion` (Task 4); `formatNumber`, `formatRate`, `formatAge` (Task 4); `doseUnitLabel` (Task 4); `parseDecimalInput` (Task 5); `Submission`, `validWeight` (Task 5); `DRUG_GROUPS` (Task 3).
- Produces:
  - `ResultsSummary({ submission, stale }: { submission: Submission | null; stale: boolean })`
  - `DrugList(props: { drugs: Drug[]; weightKg: number | null; doses: Record<string, number>; standardDiluent: string; stale: boolean; masked: boolean; onDoseChange: (drugId: string, dose: number) => void })`. The list element has `data-testid="drug-list"` and is `inert` when stale or masked.
  - `DrugRow(props: { drug: Drug; weightKg: number | null; dose: number; standardDiluent: string; expanded: boolean; onToggle: () => void; onDoseChange: (dose: number) => void })`
  - `DoseInput(props: { drug: Drug; dose: number; onDoseChange: (dose: number) => void })`, `doseStep(min: number): number`

- [ ] **Step 1: Write the failing tests**

`src/components/ResultsSummary.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import type { Submission } from '../calc/weightCheck'
import { ResultsSummary } from './ResultsSummary'

const ok: Submission['check'] = { ok: true, notes: [], safeguarding: null }

it('prompts before the first submit', () => {
  render(<ResultsSummary submission={null} stale={false} />)
  expect(screen.getByText("Enter the child's weight, then press Submit.")).toBeInTheDocument()
})

it('shows weight and age', () => {
  render(<ResultsSummary submission={{ weightKg: 14, ageMonths: 42, estimated: false, check: ok }} stale={false} />)
  expect(screen.getByText(/Rates for/)).toHaveTextContent('Rates for 14 kg · 3 years 6 months')
})

it('tags an estimated weight and omits a missing age', () => {
  render(<ResultsSummary submission={{ weightKg: 10, ageMonths: null, estimated: true, check: ok }} stale={false} />)
  expect(screen.getByText(/Rates for/)).toHaveTextContent('Rates for 10 kg Estimated')
})

it('says when the form has changed', () => {
  render(<ResultsSummary submission={{ weightKg: 14, ageMonths: null, estimated: false, check: ok }} stale />)
  expect(screen.getByText('Age or weight changed. Press Submit to update the rates.')).toBeInTheDocument()
})

it('asks for a valid weight after a blocked weight', () => {
  render(<ResultsSummary submission={{ weightKg: 200, ageMonths: null, estimated: false, check: { ok: false, message: 'x' } }} stale={false} />)
  expect(screen.getByText('Enter a valid weight to see rates.')).toBeInTheDocument()
})
```

`src/components/DrugList.test.tsx`:
```tsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { startDoses } from '../calc/infusion'
import { fixture } from '../test/fixture'
import { DrugList } from './DrugList'

type HarnessProps = { weightKg: number | null; stale?: boolean }

const Harness = ({ weightKg, stale = false }: HarnessProps) => {
  const [doses, setDoses] = useState(() => startDoses(fixture.drugs))
  return (
    <DrugList
      drugs={fixture.drugs}
      weightKg={weightKg}
      doses={doses}
      standardDiluent={fixture.standardDiluent}
      stale={stale}
      masked={false}
      onDoseChange={(drugId, dose) => setDoses(previous => ({ ...previous, [drugId]: dose }))}
    />
  )
}

const row = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name.replace(/[()]/g, '\\$&')}`) })

describe('rows', () => {
  it('shows the syringe and rate for each drug, grouped', () => {
    render(<Harness weightKg={10} />)
    expect(screen.getByText('Vasopressors and inotropes')).toBeInTheDocument()
    expect(within(row('Adrenaline')).getByText('3 mg in 50 mL')).toBeInTheDocument()
    expect(within(row('Adrenaline')).getByText('1.0')).toBeInTheDocument()
    expect(within(row('Adrenaline')).getByText('0.1 micrograms/kg/min')).toBeInTheDocument()
    expect(within(row('Insulin (soluble)')).getByText('0.50')).toBeInTheDocument()
  })

  it('shows dashes without a valid weight', () => {
    render(<Harness weightKg={null} />)
    expect(within(row('Adrenaline')).getByText('Needs a valid weight')).toBeInTheDocument()
    expect(within(row('Adrenaline')).getByText('–')).toBeInTheDocument()
  })

  it('says when the syringe does not fit', async () => {
    render(<Harness weightKg={30} />)
    expect(within(row('Thiopental')).getByText('does not fit')).toBeInTheDocument()
    await userEvent.click(row('Thiopental'))
    expect(
      screen.getByText('Needs 60 mL of stock, which does not fit a 50 mL syringe at 30 kg. Check the guideline.'),
    ).toBeInTheDocument()
  })

  it('is inert when stale', () => {
    render(<Harness weightKg={10} stale />)
    expect(screen.getByTestId('drug-list')).toHaveAttribute('inert')
  })
})

describe('an open row', () => {
  it('shows how to make up the syringe, one row at a time', async () => {
    render(<Harness weightKg={10} />)
    await userEvent.click(row('Adrenaline'))
    expect(row('Adrenaline')).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(/Draw up/)).toHaveTextContent(
      'Draw up 3 mL of 1 mg/mL. Make up to 50 mL with glucose 5% or sodium chloride 0.9%.',
    )
    expect(screen.getByText(/1 mL\/hr =/)).toHaveTextContent('1 mL/hr = 0.1 micrograms/kg/min')
    await userEvent.click(row('Noradrenaline'))
    expect(row('Adrenaline')).toHaveAttribute('aria-expanded', 'false')
  })

  it('uses the drug diluent when set', async () => {
    render(<Harness weightKg={10} />)
    await userEvent.click(row('Thiopental'))
    expect(screen.getByText(/Draw up/)).toHaveTextContent('with sodium chloride 0.9%.')
  })

  it('recalculates when the dose changes and warns outside the range', async () => {
    render(<Harness weightKg={10} />)
    await userEvent.click(row('Adrenaline'))
    const dose = screen.getByLabelText('Dose for Adrenaline')
    await userEvent.clear(dose)
    await userEvent.type(dose, '0,2')
    expect(within(row('Adrenaline')).getByText('2.0')).toBeInTheDocument()
    await userEvent.clear(dose)
    await userEvent.type(dose, '2')
    expect(screen.getByText('Above the usual range of 0.05–1 micrograms/kg/min.')).toBeInTheDocument()
    await userEvent.clear(dose)
    await userEvent.type(dose, '0.01')
    expect(screen.getByText('Below the usual range of 0.05–1 micrograms/kg/min.')).toBeInTheDocument()
  })

  it('keeps the last valid rate while the box is empty or part-typed', async () => {
    render(<Harness weightKg={10} />)
    await userEvent.click(row('Adrenaline'))
    const dose = screen.getByLabelText('Dose for Adrenaline')
    await userEvent.clear(dose)
    await userEvent.type(dose, '0.2')
    await userEvent.clear(dose)
    expect(within(row('Adrenaline')).getByText('2.0')).toBeInTheDocument()
    await userEvent.type(dose, 'abc')
    expect(within(row('Adrenaline')).getByText('2.0')).toBeInTheDocument()
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument()
  })

  it('steps the dose with the + and − buttons', async () => {
    render(<Harness weightKg={10} />)
    await userEvent.click(row('Adrenaline'))
    await userEvent.click(screen.getByRole('button', { name: 'Increase dose' }))
    expect(screen.getByLabelText('Dose for Adrenaline')).toHaveValue('0.11')
    expect(within(row('Adrenaline')).getByText('1.1')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Decrease dose' }))
    await userEvent.click(screen.getByRole('button', { name: 'Decrease dose' }))
    expect(screen.getByLabelText('Dose for Adrenaline')).toHaveValue('0.09')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/ResultsSummary.test.tsx src/components/DrugList.test.tsx`
Expected: FAIL, missing components.

- [ ] **Step 3: Implement `src/components/ResultsSummary.tsx`**

```tsx
import { formatAge, formatNumber } from '../calc/format'
import { type Submission, validWeight } from '../calc/weightCheck'

type Props = { submission: Submission | null; stale: boolean }

export const ResultsSummary = ({ submission, stale }: Props) => {
  if (submission === null) return <p className="sheet-meta">Enter the child's weight, then press Submit.</p>
  if (stale) return <p className="sheet-meta stale">Age or weight changed. Press Submit to update the rates.</p>
  const weightKg = validWeight(submission)
  if (weightKg === null) return <p className="sheet-meta">Enter a valid weight to see rates.</p>
  return (
    <p className="sheet-meta">
      Rates for <b>{formatNumber(weightKg)} kg</b>
      {submission.estimated ? <span className="weight-src"> Estimated</span> : null}
      {submission.ageMonths === null ? null : (
        <>
          <span> · </span>
          <b>{formatAge(submission.ageMonths)}</b>
        </>
      )}
    </p>
  )
}
```

- [ ] **Step 4: Implement `src/components/DoseInput.tsx`**

```tsx
import { useState } from 'react'
import { parseDecimalInput } from '../calc/patient'
import { doseUnitLabel } from '../calc/units'
import type { Drug } from '../data/types'

type Props = { drug: Drug; dose: number; onDoseChange: (dose: number) => void }

export const doseStep = (min: number): number => (min / 10 >= 1 ? 1 : Number((min / 5).toPrecision(1)))

export const DoseInput = ({ drug, dose, onDoseChange }: Props) => {
  const [text, setText] = useState(String(dose))
  const step = doseStep(drug.dose.min)

  const change = (value: string) => {
    setText(value)
    const parsed = parseDecimalInput(value)
    if (parsed !== null) onDoseChange(parsed)
  }

  const nudge = (direction: 1 | -1) => {
    const next = Math.max(0, Number((dose + direction * step).toPrecision(6)))
    setText(String(next))
    onDoseChange(next)
  }

  return (
    <div className="dose-input">
      <button type="button" className="step-btn" aria-label="Decrease dose" onClick={() => nudge(-1)}>
        −
      </button>
      <input
        inputMode="decimal"
        aria-label={`Dose for ${drug.name}`}
        value={text}
        onChange={event => change(event.target.value)}
      />
      <button type="button" className="step-btn" aria-label="Increase dose" onClick={() => nudge(1)}>
        +
      </button>
      <span>{doseUnitLabel(drug.dose.unit)}</span>
    </div>
  )
}
```

- [ ] **Step 5: Implement `src/components/DrugRow.tsx`**

```tsx
import { formatNumber, formatRate } from '../calc/format'
import { calculateInfusion, type Infusion } from '../calc/infusion'
import { doseUnitLabel } from '../calc/units'
import type { Drug } from '../data/types'
import { DoseInput } from './DoseInput'

type Props = {
  drug: Drug
  weightKg: number | null
  dose: number
  standardDiluent: string
  expanded: boolean
  onToggle: () => void
  onDoseChange: (dose: number) => void
}

const contentsText = (drug: Drug, infusion: Infusion | null) =>
  infusion === null
    ? 'Needs a valid weight'
    : `${formatNumber(infusion.totalAmount)} ${drug.syringe.amount.unit} in ${formatNumber(drug.syringe.volumeMl)} mL`

const rateText = (infusion: Infusion | null) => {
  if (infusion === null) return '–'
  return infusion.fits ? formatRate(infusion.rateMlPerHour) : 'does not fit'
}

const outOfRange = (drug: Drug, dose: number) => dose < drug.dose.min || dose > drug.dose.max

const RangeWarning = ({ drug, dose }: { drug: Drug; dose: number }) => {
  if (!outOfRange(drug, dose)) return null
  const above = dose > drug.dose.max
  return (
    <div className={above ? 'alert danger' : 'alert warn'}>
      {above ? 'Above' : 'Below'} the usual range of {formatNumber(drug.dose.min)}–{formatNumber(drug.dose.max)}{' '}
      {doseUnitLabel(drug.dose.unit)}.
    </div>
  )
}

type DetailsProps = Omit<Props, 'expanded' | 'onToggle'> & { infusion: Infusion | null }

const DrugDetails = ({ drug, weightKg, dose, standardDiluent, infusion, onDoseChange }: DetailsProps) => {
  if (infusion === null || weightKg === null) {
    return (
      <div className="row-body">
        <div className="alert danger">Enter a valid weight to see the preparation and rate.</div>
      </div>
    )
  }
  const volume = formatNumber(drug.syringe.volumeMl)
  return (
    <div className="row-body">
      {infusion.fits ? (
        <div className="instr">
          Draw up <b>{formatNumber(infusion.drawUpMl)} mL</b> of {formatNumber(drug.stock.value)} {drug.stock.unit}/mL.
          Make up to <b>{volume} mL</b> with {drug.syringe.diluent ?? standardDiluent}.
        </div>
      ) : (
        <div className="alert danger">
          Needs {formatNumber(infusion.drawUpMl)} mL of stock, which does not fit a {volume} mL syringe at{' '}
          {formatNumber(weightKg)} kg. Check the guideline.
        </div>
      )}
      <div className="rule">
        1 mL/hr = <b>{formatNumber(infusion.oneMlPerHour)} {doseUnitLabel(drug.dose.unit)}</b>
      </div>
      <DoseInput drug={drug} dose={dose} onDoseChange={onDoseChange} />
      <RangeWarning drug={drug} dose={dose} />
      {drug.notes === '' ? null : <div className="notes">{drug.notes}</div>}
    </div>
  )
}

export const DrugRow = (props: Props) => {
  const { drug, weightKg, dose, expanded, onToggle } = props
  const infusion = weightKg === null ? null : calculateInfusion(drug, weightKg, dose)
  const fits = infusion !== null && infusion.fits
  return (
    <div className="row">
      <button type="button" className="row-head" aria-expanded={expanded} onClick={onToggle}>
        <span className="rname">
          {drug.name}
          <small>{contentsText(drug, infusion)}</small>
        </span>
        <span className={dose === drug.dose.start ? 'rrate' : 'rrate adjusted'}>
          <b className={infusion !== null && !fits ? 'no-fit' : undefined}>{rateText(infusion)}</b>
          {infusion !== null && !fits ? null : <span className="u"> mL/hr</span>}
          <small className={outOfRange(drug, dose) ? 'flag' : undefined}>
            {formatNumber(dose)} {doseUnitLabel(drug.dose.unit)}
          </small>
        </span>
        <span className="chev" aria-hidden="true" />
      </button>
      {expanded ? <DrugDetails {...props} infusion={infusion} /> : null}
    </div>
  )
}
```

Note: the small tag renders `0.1 micrograms/kg/min` as one text node, which the test matches.

- [ ] **Step 6: Implement `src/components/DrugList.tsx`**

```tsx
import { useState } from 'react'
import { DRUG_GROUPS } from '../data/groups'
import type { Drug } from '../data/types'
import { DrugRow } from './DrugRow'

type Props = {
  drugs: Drug[]
  weightKg: number | null
  doses: Record<string, number>
  standardDiluent: string
  stale: boolean
  masked: boolean
  onDoseChange: (drugId: string, dose: number) => void
}

const listClass = (stale: boolean, masked: boolean) =>
  ['list', stale ? 'stale' : '', masked ? 'masked' : ''].filter(name => name !== '').join(' ')

export const DrugList = ({ drugs, weightKg, doses, standardDiluent, stale, masked, onDoseChange }: Props) => {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className={listClass(stale, masked)} data-testid="drug-list" inert={stale || masked}>
      {DRUG_GROUPS.map(group => {
        const items = drugs.filter(drug => drug.group === group.key)
        if (items.length === 0) return null
        return (
          <section key={group.key}>
            <h3 className="grp-title">
              <span className="swatch" style={{ background: group.colour }} />
              {group.label}
            </h3>
            <div className="grp">
              {items.map(drug => (
                <DrugRow
                  key={drug.id}
                  drug={drug}
                  weightKg={weightKg}
                  dose={doses[drug.id] ?? drug.dose.start}
                  standardDiluent={standardDiluent}
                  expanded={expandedId === drug.id}
                  onToggle={() => setExpandedId(current => (current === drug.id ? null : drug.id))}
                  onDoseChange={dose => onDoseChange(drug.id, dose)}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run src/components && npm run typecheck`
Expected: PASS. If a `within(row(...)).getByText(...)` fails only because the text is split across elements, fix the markup (one text node per value), not the test.

- [ ] **Step 8: Commit**

```bash
git add src/components
git commit -m "Add results summary and grouped drug list with dose adjustment"
```

---

### Task 9: Safeguarding mask and flag

**Files:**
- Create: `src/components/SafeguardingMask.tsx`, `src/components/SafeguardingFlag.tsx`
- Test: `src/components/Safeguarding.test.tsx`

**Interfaces:**
- Consumes: `Safeguarding`, `safeguardingDetail` (Task 5); `formatNumber` (Task 4).
- Produces:
  - `SafeguardingMask({ safeguarding, onChangeWeight, onProceed }: { safeguarding: Safeguarding; onChangeWeight: () => void; onProceed: () => void })`
  - `SafeguardingFlag({ safeguarding }: { safeguarding: Safeguarding })`

- [ ] **Step 1: Write the failing tests**

`src/components/Safeguarding.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { SafeguardingFlag } from './SafeguardingFlag'
import { SafeguardingMask } from './SafeguardingMask'

const safeguarding = { weightKg: 17, expectedKg: 10, message: 'This weight is far above the expected weight for age.' }

it('mask shows the weights, the message and both actions', async () => {
  const onChangeWeight = vi.fn()
  const onProceed = vi.fn()
  render(<SafeguardingMask safeguarding={safeguarding} onChangeWeight={onChangeWeight} onProceed={onProceed} />)
  const card = screen.getByRole('alertdialog', { name: 'Safeguarding flag' })
  expect(card).toHaveFocus()
  expect(screen.getByText('17 kg entered. Expected for age: about 10 kg.')).toBeInTheDocument()
  expect(screen.getByText(safeguarding.message)).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Change weight' }))
  expect(onChangeWeight).toHaveBeenCalledOnce()
  await userEvent.click(screen.getByRole('button', { name: 'Proceed with this weight' }))
  expect(onProceed).toHaveBeenCalledOnce()
})

it('flag reminds the user which weight they proceeded with', () => {
  render(<SafeguardingFlag safeguarding={safeguarding} />)
  expect(screen.getByText('Safeguarding flag')).toBeInTheDocument()
  expect(screen.getByText('17 kg entered. Expected for age: about 10 kg. Proceeding with 17 kg.')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/Safeguarding.test.tsx`
Expected: FAIL, missing components.

- [ ] **Step 3: Implement**

`src/components/SafeguardingMask.tsx`:
```tsx
import { useEffect, useRef } from 'react'
import { type Safeguarding, safeguardingDetail } from '../calc/weightCheck'

type Props = { safeguarding: Safeguarding; onChangeWeight: () => void; onProceed: () => void }

export const SafeguardingMask = ({ safeguarding, onChangeWeight, onProceed }: Props) => {
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    cardRef.current?.focus({ preventScroll: true })
  }, [])

  return (
    <div className="mask">
      <div
        className="mask-card"
        ref={cardRef}
        tabIndex={-1}
        role="alertdialog"
        aria-labelledby="mask-title"
        aria-describedby="mask-body"
      >
        <div className="mask-head">
          <span className="sg-icon" aria-hidden="true">
            !
          </span>
          <strong id="mask-title">Safeguarding flag</strong>
        </div>
        <div className="mask-body" id="mask-body">
          <p className="kg">{safeguardingDetail(safeguarding)}</p>
          <p>{safeguarding.message}</p>
        </div>
        <div className="mask-actions">
          <button type="button" className="btn-secondary" onClick={onChangeWeight}>
            Change weight
          </button>
          <button type="button" className="btn-flag" onClick={onProceed}>
            Proceed with this weight
          </button>
        </div>
      </div>
    </div>
  )
}
```

`src/components/SafeguardingFlag.tsx`:
```tsx
import { formatNumber } from '../calc/format'
import { type Safeguarding, safeguardingDetail } from '../calc/weightCheck'

type Props = { safeguarding: Safeguarding }

export const SafeguardingFlag = ({ safeguarding }: Props) => (
  <div className="sg-flag" role="note">
    <span className="sg-icon" aria-hidden="true">
      !
    </span>
    <div>
      <strong>Safeguarding flag</strong>
      <p>{`${safeguardingDetail(safeguarding)} Proceeding with ${formatNumber(safeguarding.weightKg)} kg.`}</p>
    </div>
  </div>
)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/Safeguarding.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/SafeguardingMask.tsx src/components/SafeguardingFlag.tsx src/components/Safeguarding.test.tsx
git commit -m "Add safeguarding mask and reminder flag"
```

---

### Task 10: Wire the app together

**Files:**
- Modify: `src/App.tsx`, `src/App.test.tsx`, `src/main.tsx`

**Interfaces:**
- Consumes: every component (Tasks 6 to 9); `checkWeight`, `validWeight`, `Submission` (Task 5); `startDoses` (Task 4); `data` (Task 3).
- Produces: `App({ data }: { data: AppData })`.

- [ ] **Step 1: Replace `src/App.test.tsx` with the failing tests**

```tsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { fixture } from './test/fixture'
import { App } from './App'

const renderApp = async () => {
  render(<App data={fixture} />)
  await userEvent.click(screen.getByRole('button', { name: 'I understand' }))
}

const submit = async (years: string, weight: string) => {
  if (years !== '') await userEvent.type(screen.getByLabelText('Age, years'), years)
  if (weight !== '') await userEvent.type(screen.getByLabelText('Weight'), weight)
  await userEvent.click(screen.getByRole('button', { name: 'Submit' }))
}

const adrenalineRow = () => screen.getByRole('button', { name: /^Adrenaline/ })

describe('disclaimer', () => {
  it('blocks the page until acknowledged', async () => {
    render(<App data={fixture} />)
    expect(screen.getByTestId('page')).toHaveAttribute('inert')
    await userEvent.click(screen.getByRole('button', { name: 'I understand' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByTestId('page')).not.toHaveAttribute('inert')
  })
})

it('shows the banner and data version', async () => {
  await renderApp()
  expect(screen.getByText('Prototype only. Not for clinical use.')).toBeInTheDocument()
  expect(screen.getByText(`Data version ${fixture.version} · Updated ${fixture.updated}`)).toBeInTheDocument()
})

it('shows rates after Submit', async () => {
  await renderApp()
  expect(within(adrenalineRow()).getByText('–')).toBeInTheDocument()
  await submit('3', '14')
  expect(screen.getByText(/Rates for/)).toHaveTextContent('Rates for 14 kg · 3 years')
  expect(within(adrenalineRow()).getByText('1.0')).toBeInTheDocument()
})

it('goes stale after an edit and refreshes on Submit', async () => {
  await renderApp()
  await submit('', '14')
  await userEvent.type(screen.getByLabelText('Weight'), '0')
  expect(screen.getByText('Age or weight changed. Press Submit to update the rates.')).toBeInTheDocument()
  expect(screen.getByTestId('drug-list')).toHaveAttribute('inert')
  await userEvent.click(screen.getByRole('button', { name: 'Submit' }))
  expect(screen.getByText(/Rates for/)).toHaveTextContent('Rates for 140 kg')
  expect(screen.getByTestId('drug-list')).not.toHaveAttribute('inert')
})

it('blocks an impossible weight', async () => {
  await renderApp()
  await submit('', '200')
  expect(screen.getByText('200 kg is not a possible weight. Enter a weight between 0.3 and 150 kg.')).toBeInTheDocument()
  expect(within(adrenalineRow()).getByText('–')).toBeInTheDocument()
})

it('does not run age checks on an estimated weight', async () => {
  await renderApp()
  await userEvent.type(screen.getByLabelText('Age, years'), '1')
  await userEvent.click(screen.getByLabelText('estimate weight'))
  await userEvent.click(screen.getByRole('button', { name: 'Submit' }))
  expect(screen.getByText(/Rates for/)).toHaveTextContent('Rates for 10 kg Estimated · 1 year')
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
})

describe('safeguarding', () => {
  it('masks results until the user proceeds, and again on every Submit', async () => {
    await renderApp()
    await submit('1', '17')
    expect(screen.getByRole('alertdialog', { name: 'Safeguarding flag' })).toBeInTheDocument()
    expect(screen.getByText(fixture.weightForAgeChecks.messageAbove)).toBeInTheDocument()
    expect(screen.getByTestId('drug-list')).toHaveAttribute('inert')

    await userEvent.click(screen.getByRole('button', { name: 'Proceed with this weight' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByText('17 kg entered. Expected for age: about 10 kg. Proceeding with 17 kg.')).toBeInTheDocument()
    expect(screen.getByTestId('drug-list')).not.toHaveAttribute('inert')

    await userEvent.click(screen.getByRole('button', { name: 'Submit' }))
    expect(screen.getByRole('alertdialog', { name: 'Safeguarding flag' })).toBeInTheDocument()
  })

  it('Change weight focuses the weight box', async () => {
    await renderApp()
    await submit('1', '5')
    expect(screen.getByText(fixture.weightForAgeChecks.messageBelow)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Change weight' }))
    expect(screen.getByLabelText('Weight')).toHaveFocus()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL (App takes no `data` prop and renders only a heading).

- [ ] **Step 3: Replace `src/App.tsx`**

```tsx
import { useRef, useState } from 'react'
import { startDoses } from './calc/infusion'
import type { PatientInput } from './calc/patient'
import { checkWeight, type Submission, validWeight } from './calc/weightCheck'
import { Banner } from './components/Banner'
import { Disclaimer } from './components/Disclaimer'
import { DrugList } from './components/DrugList'
import { PatientForm } from './components/PatientForm'
import { ResultsSummary } from './components/ResultsSummary'
import { SafeguardingFlag } from './components/SafeguardingFlag'
import { SafeguardingMask } from './components/SafeguardingMask'
import type { AppData } from './data/types'

type Props = { data: AppData }

export const App = ({ data }: Props) => {
  const [acknowledged, setAcknowledged] = useState(false)
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [stale, setStale] = useState(false)
  const [proceeded, setProceeded] = useState(false)
  const [doses, setDoses] = useState(() => startDoses(data.drugs))
  const weightInputRef = useRef<HTMLInputElement>(null)

  const check = submission === null ? null : submission.check
  const safeguarding = check !== null && check.ok ? check.safeguarding : null
  const masked = safeguarding !== null && !proceeded

  const submit = (patient: PatientInput) => {
    setSubmission({ ...patient, check: checkWeight(patient, data) })
    setStale(false)
    setProceeded(false)
  }

  const changeWeight = () => {
    weightInputRef.current?.focus()
    weightInputRef.current?.select()
  }

  return (
    <>
      {acknowledged ? null : <Disclaimer disclaimer={data.disclaimer} onAcknowledge={() => setAcknowledged(true)} />}
      <div data-testid="page" inert={!acknowledged}>
        <Banner text={data.prototypeBanner} />
        <header className="bar">
          <div className="bar-inner">
            <div className="brand">
              <strong>Paeds Infusion Calculator</strong> · PICU and transfer
            </div>
            <PatientForm
              bands={data.weightFromAge}
              check={check}
              weightInputRef={weightInputRef}
              onSubmit={submit}
              onEdit={() => setStale(true)}
            />
          </div>
        </header>
        <main className="wrap">
          {safeguarding !== null && proceeded ? <SafeguardingFlag safeguarding={safeguarding} /> : null}
          <ResultsSummary submission={submission} stale={stale} />
          <div className="results">
            <DrugList
              drugs={data.drugs}
              weightKg={validWeight(submission)}
              doses={doses}
              standardDiluent={data.standardDiluent}
              stale={stale}
              masked={masked}
              onDoseChange={(drugId, dose) => setDoses(previous => ({ ...previous, [drugId]: dose }))}
            />
            {safeguarding !== null && !proceeded ? (
              <SafeguardingMask
                safeguarding={safeguarding}
                onChangeWeight={changeWeight}
                onProceed={() => setProceeded(true)}
              />
            ) : null}
          </div>
          <footer>{`Data version ${data.version} · Updated ${data.updated}`}</footer>
        </main>
      </div>
    </>
  )
}
```

- [ ] **Step 4: Replace `src/main.tsx`**

```tsx
import '@fontsource/roboto/latin-400.css'
import '@fontsource/roboto/latin-500.css'
import '@fontsource/roboto/latin-700.css'
import './styles.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { data } from './data'

const root = document.getElementById('root')

if (root) {
  createRoot(root).render(
    <StrictMode>
      <App data={data} />
    </StrictMode>,
  )
}
```

If `@fontsource/roboto/latin-400.css` does not exist in the installed version (`ls node_modules/@fontsource/roboto`), use `@fontsource/roboto/400.css` and the same for 500 and 700.

- [ ] **Step 5: Run all tests and typecheck**

Run: `npm test && npm run typecheck`
Expected: all pass.

- [ ] **Step 6: Check it in a browser**

Run: `npm run dev`, then open the printed URL (it ends in `/paeds-infusion-calculator/`) at 390px wide and at desktop width. Check:
- The disclaimer blocks the page; Escape does not close it.
- 3 years, 14 kg, Submit: rates appear.
- 1 year, 17 kg: the mask appears.
- 1 year with estimate weight ticked: 10 kg is locked.
- There is no horizontal scroll at 360px.
- The page is readable in dark mode.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/App.test.tsx src/main.tsx
git commit -m "Wire the calculator together"
```

---

### Task 11: Offline support and icon

**Files:**
- Create: `public/icon.svg`
- Modify: `vite.config.ts`, `tsconfig.json`, `src/main.tsx`, `index.html`

**Interfaces:**
- Consumes: the app from Task 10.
- Produces: `dist/` with a service worker and manifest; the page updates itself when a new version is deployed.

- [ ] **Step 1: Create `public/icon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="96" fill="#0B5C8C"/><text x="256" y="318" font-family="Roboto, Arial, sans-serif" font-size="200" font-weight="700" fill="#FFFFFF" text-anchor="middle">mL</text></svg>
```

- [ ] **Step 2: Add the PWA plugin to `vite.config.ts`**

```ts
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: '/paeds-infusion-calculator/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Paeds Infusion Calculator',
        short_name: 'Infusions',
        description: 'Drug infusion calculator for paediatric intensive care and transfer.',
        theme_color: '#0B5C8C',
        background_color: '#EEF2F5',
        display: 'standalone',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,woff2}'] },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
  },
})
```

- [ ] **Step 3: Register the service worker**

In `tsconfig.json`, change `"types"` to `["vite/client", "vite-plugin-pwa/client", "node"]`.

In `src/main.tsx`, add after the `./styles.css` import:
```tsx
import { registerSW } from 'virtual:pwa-register'
```
and before `const root = …`:
```tsx
registerSW({ immediate: true })
```

In `index.html`, add inside `<head>`:
```html
    <link rel="icon" href="/icon.svg" type="image/svg+xml" />
```

- [ ] **Step 4: Build and check the output**

Run: `npm run build && ls dist`
Expected: `drugs.yaml is valid: 14 drugs.`, then a Vite build. `dist` contains `index.html`, `sw.js`, `manifest.webmanifest` and `icon.svg`.

Run: `npm run preview`, then open `http://localhost:4173/paeds-infusion-calculator/`. In DevTools → Application, the service worker is active and Roboto is precached. Tick Network → Offline, reload, and the calculator still works.

- [ ] **Step 5: Run tests and commit**

Run: `npm test && npm run typecheck`
Expected: all pass.

```bash
git add public vite.config.ts tsconfig.json src/main.tsx index.html
git commit -m "Work offline after the first visit"
```

---

### Task 12: Rate table, CI and deploy workflow, README

**Files:**
- Create: `src/calc/rateTable.ts`, `scripts/rate-table.ts`, `.github/workflows/deploy.yml`
- Modify: `README.md`
- Test: `src/calc/rateTable.test.ts`

**Interfaces:**
- Consumes: `calculateInfusion` (Task 4); `formatRate`, `formatNumber` (Task 4); `doseUnitLabel` (Task 4); `loadData` (Task 3).
- Produces: `rateTable(before: Drug[] | null, after: Drug[]): string` (markdown); `npm run rate-table -- <before.yaml> <after.yaml>`.

- [ ] **Step 1: Write the failing tests**

`src/calc/rateTable.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { fixture } from '../test/fixture'
import { rateTable } from './rateTable'

const adrenalineLine = (table: string) => table.split('\n').find(line => line.startsWith('| Adrenaline |'))

describe('rateTable', () => {
  it('lists every drug at 3, 10 and 30 kg', () => {
    const table = rateTable(null, fixture.drugs)
    expect(table).toContain('| Drug | Start dose | Range | 3 kg | 10 kg | 30 kg |')
    expect(adrenalineLine(table)).toBe('| Adrenaline | 0.1 micrograms/kg/min | 0.05–1 | 1.0 | 1.0 | 1.0 |')
    expect(table).toContain('| Thiopental | 2 mg/kg/hour | 1–5 | 2.0 | 2.0 | does not fit |')
    expect(table).toContain('No earlier version to compare with.')
  })

  it('shows changes as before → after', () => {
    const changed = fixture.drugs.map(drug =>
      drug.name === 'Adrenaline' ? { ...drug, dose: { ...drug.dose, start: 0.2 } } : drug,
    )
    expect(adrenalineLine(rateTable(fixture.drugs, changed))).toBe(
      '| Adrenaline | 0.1 micrograms/kg/min → **0.2 micrograms/kg/min** | 0.05–1 | 1.0 → **2.0** | 1.0 → **2.0** | 1.0 → **2.0** |',
    )
  })

  it('shows added and removed drugs', () => {
    const table = rateTable(fixture.drugs, fixture.drugs.filter(drug => drug.name !== 'Adrenaline'))
    expect(adrenalineLine(table)).toBe(
      '| Adrenaline | 0.1 micrograms/kg/min → **—** | 0.05–1 → **—** | 1.0 → **—** | 1.0 → **—** | 1.0 → **—** |',
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/calc/rateTable.test.ts`
Expected: FAIL, missing `./rateTable`.

- [ ] **Step 3: Implement `src/calc/rateTable.ts` and `scripts/rate-table.ts`**

`src/calc/rateTable.ts`:
```ts
import type { Drug } from '../data/types'
import { formatNumber, formatRate } from './format'
import { calculateInfusion } from './infusion'
import { doseUnitLabel } from './units'

const WEIGHTS_KG = [3, 10, 30]

type Column = { title: string; value: (drug: Drug) => string }

const rateAt = (weightKg: number) => (drug: Drug) => {
  const infusion = calculateInfusion(drug, weightKg, drug.dose.start)
  return infusion.fits ? formatRate(infusion.rateMlPerHour) : 'does not fit'
}

const COLUMNS: Column[] = [
  { title: 'Start dose', value: drug => `${formatNumber(drug.dose.start)} ${doseUnitLabel(drug.dose.unit)}` },
  { title: 'Range', value: drug => `${formatNumber(drug.dose.min)}–${formatNumber(drug.dose.max)}` },
  ...WEIGHTS_KG.map(weightKg => ({ title: `${weightKg} kg`, value: rateAt(weightKg) })),
]

const cell = (column: Column, before: Drug | undefined, after: Drug | undefined, compare: boolean) => {
  const now = after === undefined ? '—' : column.value(after)
  if (!compare) return now
  const was = before === undefined ? '—' : column.value(before)
  return was === now ? now : `${was} → **${now}**`
}

export const rateTable = (before: Drug[] | null, after: Drug[]): string => {
  const compare = before !== null
  const names = [...new Set([...(before ?? []).map(drug => drug.name), ...after.map(drug => drug.name)])]
  const rows = names.map(name => {
    const was = before?.find(drug => drug.name === name)
    const now = after.find(drug => drug.name === name)
    return `| ${name} | ${COLUMNS.map(column => cell(column, was, now, compare)).join(' | ')} |`
  })
  return [
    '### Rates at the start dose (mL/hr)',
    '',
    compare ? 'Changed values show before → **after**.' : 'No earlier version to compare with.',
    '',
    `| Drug | ${COLUMNS.map(column => column.title).join(' | ')} |`,
    `| --- |${COLUMNS.map(() => ' --- |').join('')}`,
    ...rows,
    '',
  ].join('\n')
}
```

`scripts/rate-table.ts`:
```ts
import { existsSync, readFileSync } from 'node:fs'
import { rateTable } from '../src/calc/rateTable'
import { loadData } from '../src/data/load'
import type { Drug } from '../src/data/types'

const load = (path: string | undefined): Drug[] | null => {
  if (path === undefined || !existsSync(path)) return null
  const result = loadData(readFileSync(path, 'utf8'))
  return result.ok ? result.data.drugs : null
}

const [beforePath, afterPath = 'drugs.yaml'] = process.argv.slice(2)
const after = load(afterPath)

if (after === null) {
  console.log(`${afterPath} has problems, so no rate table was made.`)
  process.exitCode = 1
} else {
  console.log(rateTable(load(beforePath), after))
}
```

Run: `npx vitest run src/calc/rateTable.test.ts && npm run --silent rate-table -- missing.yaml drugs.yaml`
Expected: PASS; a markdown table printed with "No earlier version to compare with."

- [ ] **Step 4: Create `.github/workflows/deploy.yml`**

```yaml
name: Checks and deploy

on:
  pull_request:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}

jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v5
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - name: Check drugs.yaml
        run: npm run validate
      - name: Rate table
        if: github.event_name == 'pull_request'
        run: |
          git show "origin/${{ github.base_ref }}:drugs.yaml" > "$RUNNER_TEMP/before.yaml" || rm -f "$RUNNER_TEMP/before.yaml"
          npm run --silent rate-table -- "$RUNNER_TEMP/before.yaml" drugs.yaml >> "$GITHUB_STEP_SUMMARY"
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v4
        if: github.event_name != 'pull_request'
        with:
          path: dist

  deploy:
    if: github.event_name != 'pull_request'
    needs: checks
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 5: Update `README.md`**

Replace the line `The automatic checks and required approval are not set up yet.` with:

```markdown
The automatic checks are set up. The required second approval is not set up yet.

If a check fails, open the pull request, press **Details** next to the failed check, and read the lines under **Check drugs.yaml**. Each one names the drug and field, for example `Adrenaline → dose → max: must be a number (found "1,5")`. The rate table is on the check's **Summary** page.
```

In the `drugs.yaml` sections table, add after the `disclaimer` row:

```markdown
| `prototype_banner` | The thin banner at the top of the page. Set it to `""` to hide it. |
```

At the end of the file, add:

````markdown
## For developers

Requires Node 24 (`nvm use`).

```bash
npm ci
npm run dev        # local server
npm test           # unit and component tests
npm run validate   # check drugs.yaml
npm run build      # validate, typecheck and build to dist/
```

Code lives in `src/`: `data/` reads and checks `drugs.yaml`, `calc/` does the maths, `components/` is the interface. Tests use `src/test/fixture-drugs.yaml`, not `drugs.yaml`, so dose changes never break them.
````

- [ ] **Step 6: Run everything and commit**

Run: `npm run build && npm test`
Expected: all pass.

```bash
git add src/calc/rateTable.ts src/calc/rateTable.test.ts scripts/rate-table.ts .github README.md
git commit -m "Add CI checks, rate table and Pages deploy"
```

---

### Task 13: Push and verify the deploy

**Files:** none.

- [ ] **Step 1: Confirm no footprint before pushing**

Run: `git log --format='%an <%ae>%n%b' origin/main..HEAD | grep -iE 'cl[a]ude|co-authored|anthr[o]pic|session' ; grep -riE 'cl[a]ude|anthr[o]pic' --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git . ; echo done`
Expected: only `done` is printed.

- [ ] **Step 2: Push**

```bash
git push origin main
```

- [ ] **Step 3: Watch the workflow**

Run: `gh run watch --exit-status $(gh run list --workflow deploy.yml --limit 1 --json databaseId --jq '.[0].databaseId')`
Expected: `checks` and `deploy` both succeed.

- [ ] **Step 4: Check the live site**

Open `https://weepotty.github.io/paeds-infusion-calculator/` on a phone and a desktop. Repeat the Task 10 Step 6 checks. Then check offline: load once, turn on airplane mode, reload.

- [ ] **Step 5: Test the editor path with a throwaway PR**

```bash
git switch -c test-editor-check
sed -i '' 's/^      max: 1$/      max: 1,5/' drugs.yaml
git commit -am "Test: invalid dose"
git push -u origin test-editor-check
gh pr create --fill --title "Test: invalid dose (do not merge)"
```
Expected: the PR's check fails, with `Adrenaline → dose → max: must be a number (found "1,5")` shown on the diff and in the log. Then close it: `gh pr close --delete-branch` and `git switch main && git branch -D test-editor-check`.

- [ ] **Step 6: Offer branch protection (ask the user first; it changes repo settings)**

When the user approves:
```bash
gh api -X PUT repos/weepotty/paeds-infusion-calculator/branches/main/protection \
  -F required_status_checks[strict]=true -f 'required_status_checks[contexts][]=checks' \
  -F enforce_admins=false -F required_pull_request_reviews[required_approving_review_count]=1 \
  -F restrictions=null
```
Then change the README line to `The automatic checks and a second approval are required before a change goes live.`, commit and push through a PR.

---

## Unresolved Questions

- Named clinical service or personal/open-source? (MHRA / DCB0129.)
- Editor's GitHub account; who approves?
- weepotty@gmail.com on the GitHub account? (Commit linking.)
- Branch protection now or after the editor has an account? One approval blocks a solo editor.
- Should unticking "estimate weight" clear the weight box? The plan clears it, so a measured weight must be typed.
