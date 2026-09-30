# Paeds Infusion Calculator: design

Date: 2026-09-30

## Purpose

A web calculator for drug infusions in paediatric intensive care and paediatric transfer, replacing the functionality of a deprecated app. A clinician enters a child's age and weight and sees, for each drug, how to make up the syringe and the infusion rate in mL/hour.

It is hosted on GitHub Pages. A non-technical clinical editor maintains all doses and limits by editing one file, `drugs.yaml`, through the GitHub website.

## Constraints

- All clinical content lives in `drugs.yaml`. The editor never touches code.
- Phone-first. It must also work on tablet and desktop.
- Works offline once opened, for ambulances with no signal.
- UK conventions: "micrograms" and "nanograms" written in full; drug groups coloured to match ISO 26825 syringe labels.
- Font: Roboto, bundled with the app (not loaded from Google at runtime).
- All values are placeholders until a named clinician signs them off.

## Out of scope for now

- Bolus / loading doses (e.g. phenobarbital)
- Growth-centile weight checks, sex input
- Weight estimate for under 1 year
- GitHub Releases, a form-based editor (Pages CMS), Google Sheets as a source

## User flow

1. **Disclaimer.** A modal appears on every visit: title, bold heading, text, and a single button. It cannot be dismissed any other way. All four strings come from `drugs.yaml`.
2. **Prototype banner.** A thin banner reads "Prototype only. Not for clinical use." Its text comes from `drugs.yaml`. An empty value hides it.
3. **Patient form.**
   - Age: years box and months box, both optional. Whole numbers only. Months 0–11 when years are entered. 18 years maximum.
   - Weight: kg box, no spinner buttons.
   - "Estimate weight" tick box: shown only when the age falls inside a `weight_from_age` band. Otherwise it is hidden and the message "Enter an age of 1–13 years to estimate weight." is shown (range text generated from the data). Ticking it fills and locks the weight box with the estimate. If the age moves out of range, it unticks and clears the weight. Unticking it clears the weight, so a measured weight must be typed.
   - Submit button (Enter also submits). Rates only change on Submit.
4. **Results.**
   - Summary box: "Rates for **14 kg** · **3 years 6 months**", with an "Estimated" tag when the weight is estimated.
   - If the form changes after Submit, the list fades and the summary reads "Age or weight changed. Press Submit to update the rates."
   - Drug list grouped by drug group, each group headed with its colour. Each row shows the name, the syringe contents ("4.2 mg in 50 mL"), the rate in mL/hr, and the dose it is based on.
   - Tapping a row opens it (one at a time): draw-up instruction, "1 mL/hr = …", dose input with − and + buttons, range warning, notes.
   - Every Submit resets all doses to their start values.
   - A dose changed from its start value shows its rate in the accent colour. A dose outside `min`–`max` shows a warning (amber below, red above).
5. **Footer.** Data version and date from `drugs.yaml`.

## Weight checks

Run on Submit, in this order:

| Check | Source | Result |
| --- | --- | --- |
| Impossible weight | `weight_limits.block_*` | Red message; every rate shows "–". |
| Unusual weight | `weight_limits.warn_*` | Red note; rates shown. |
| Differs from age estimate by more than `check_if_differs_by_percent` | `weight_for_age_checks` | Red "check the weight and age" note; rates shown. |
| Far below / above the estimate | `weight_for_age_checks.safeguarding_*` | Results blurred behind a card showing the weight entered, the expected weight and the message from the data. Buttons: "Change weight" (focuses the weight box) and "Proceed with this weight". After proceeding, a red reminder stays above the list. Every Submit resets this. |

Age-based checks only run when an age is entered, a `weight_from_age` band covers it, and the weight was measured (not estimated). A syringe that needs more stock than it can hold shows "does not fit" instead of a rate.

## Data file: `drugs.yaml`

Top-level sections: `version`, `updated`, `disclaimer`, `prototype_banner`, `standard_diluent`, `weight_limits`, `weight_for_age_checks`, `weight_from_age`, `drugs`.

Human-readable values are parsed by the app:

- Amount: `<number> <unit>` or `<number> <unit>/kg`. Units: `mg`, `micrograms`, `nanograms`, `units`. `/kg` means the amount scales with weight.
- Stock: `<number> <unit>/mL`.
- Volume: `<number> mL`.
- Dose unit: `<unit>/kg/min` or `<unit>/kg/hour`.
- Age: `<number> year(s)` or `<number> month(s)`. `to_age` includes the whole of that year or month.

Each drug: `name`, `group`, `stock`, `syringe.amount`, `syringe.make_up_to`, optional `syringe.diluent`, `dose.unit`, `dose.min`, `dose.start`, `dose.max`, `notes`, `reviewed_by`, `reviewed_on`.

### Validation

A schema check runs at build time and in CI. It fails, and so blocks deploy, if:

- a required field is missing or misspelt, or an unknown field is present
- a unit or group is not in the allowed list
- a number is not positive, or `min ≤ start ≤ max` does not hold
- the dose and syringe units cannot be converted (e.g. `units` against `mg`)
- two drugs share a name
- weight limits are out of order (`block_below < warn_below < warn_above < block_above`)
- `reviewed_by` or `reviewed_on` is empty (placeholder text allowed for now)

Error messages name the drug and field in plain English, e.g. `Adrenaline → dose → max: must be a number (found "1,5")`.

## Calculation

```
total      = amount × weight (if /kg) or amount
conc       = total ÷ volume                           (syringe unit per mL)
rate mL/hr = dose × weight × (60 if per min) ÷ conc   (after unit conversion)
1 mL/hr    = conc ÷ weight ÷ (60 if per min)          (in dose units)
draw up mL = total ÷ stock concentration
fits       = draw up < volume
estimate   = multiply_by × age (completed years or months) + then_add_kg
```

Rounding for display only: rates to 1 decimal place, or 2 below 1 mL/hr. Other values to up to 3 significant figures, trailing zeros removed. Calculations use unrounded numbers.

## Architecture

- **Vite + React + TypeScript**, built to static files.
- `src/data/`: loads `drugs.yaml` at build time (bundled, not fetched at runtime), validates it with a Zod schema, and parses the readable strings into typed objects. Invalid data fails the build.
- `src/calc/`: pure functions for unit conversion, rates, weight estimate and weight checks. No React.
- `src/components/`: Disclaimer, Banner, PatientForm, ResultsSummary, SafeguardingMask, DrugList, DrugRow.
- **Offline:** `vite-plugin-pwa` caches the app after the first visit.
- **Font:** `@fontsource/roboto`, bundled.

## CI and deploy (GitHub Actions)

- **On pull request:** install, typecheck, validate `drugs.yaml`, run tests, and write a before/after table of rates at 3, 10 and 30 kg to the job summary.
- **On push to `main`:** the same checks, then build and deploy to GitHub Pages at `https://weepotty.github.io/paeds-infusion-calculator/`.
- **Branch protection on `main`** (repo setting, after the first deploy): changes only through a pull request, 1 approval, checks passing.

## Testing

- **Unit (Vitest):** unit conversion; rate, 1 mL/hr, draw-up and fit for every drug at fixed weights; weight estimate at band edges (11, 12, 167, 168 months); each weight-check tier; value parsing ("0.3 mg/kg", "50 units", "1 year").
- **Schema:** the real `drugs.yaml` passes; a set of broken fixtures each fail with the expected message.
- **Components (Testing Library):** the estimate box is hidden out of range; the list goes stale after edits; the safeguarding mask blocks results until "Proceed"; the disclaimer blocks the page until acknowledged.

## Unresolved questions

- Real clinical use by a named service, or personal/open-source? Affects MHRA / DCB0129 work.
- Editor's GitHub account: who, and who approves changes?
- weepotty@gmail.com on the GitHub account? (Commit linking.)
- Before/after rate table as a PR comment instead of a job summary? The job summary is simpler.
