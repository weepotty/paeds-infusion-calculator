# Paeds Infusion Calculator

A web calculator for drug infusions in paediatric intensive care and paediatric transfer. Enter the child's age and weight, and it shows how to make up each syringe and the rate in mL/hour.

> **All doses, concentrations and limits in this repository are placeholders. Do not use clinically.**

## Changing doses, drugs and limits

Everything clinical lives in one file: [`drugs.yaml`](drugs.yaml). You never need to touch the app's code.

### How a change goes live

1. Open [`drugs.yaml`](drugs.yaml) on github.com and press the pencil icon (**Edit this file**).
2. Change the value you need, for example `max: 1` to `max: 0.5`.
3. Press **Commit changes…**, choose **Create a new branch and start a pull request**, then **Propose changes**. Nothing is live yet.
4. Automatic checks run on your change. They stop it if a number is missing, a unit is misspelt, or `min` is above `max`. They also show a before/after table of rates at a few example weights.
5. A second clinician reviews and approves the pull request.
6. Press **Merge**. The site updates within a few minutes.

The automatic checks and required approval are not set up yet.

### Editing rules

- Change only the values after the colons. Leave the words before them alone.
- Keep the spaces at the start of each line exactly as they are.
- Use a full stop for decimals: `0.5`, not `0,5` or `.5`.
- Lines starting with `#` are notes for people. The app ignores them.
- Update `reviewed_by` and `reviewed_on` on any drug you change.

The top of `drugs.yaml` lists the units and drug groups the app understands.

### What is in `drugs.yaml`

| Section | What it controls |
| --- | --- |
| `disclaimer` | The pop-up shown every time someone opens the calculator: title, heading, text and button label. |
| `standard_diluent` | The diluent shown in syringe instructions, unless a drug sets its own. |
| `weight_limits` | Weights that are impossible (no rates shown) or unusual (rates shown with a warning). Applies at every age. |
| `weight_for_age_checks` | How far the weight can differ from the age estimate before a "check" note, or before the safeguarding flag that hides results until the user confirms the weight. Includes the flag wording. |
| `weight_from_age` | The formula used when the user ticks "estimate weight", and the ages it covers. The tick box only appears for ages covered here. |
| `drugs` | One entry per drug: stock strength, syringe recipe, dose unit, and the `min`, `start` and `max` doses. |

### A drug entry

```yaml
  - name: Adrenaline
    group: vasopressor
    stock: 1 mg/mL
    syringe:
      amount: 0.3 mg/kg      # "/kg" means the syringe strength changes with weight
      make_up_to: 50 mL
    dose:
      unit: micrograms/kg/min
      min: 0.05
      start: 0.1
      max: 1                 # doses above this show a red warning
    notes: ""
    reviewed_by: PLACEHOLDER
    reviewed_on: PLACEHOLDER
```

To add a drug, copy an existing entry, paste it at the end of the `drugs` list, and change the values.
