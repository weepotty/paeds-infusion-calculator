import { formatAge, formatWeight } from '../calc/format'
import { type Submission, validWeight } from '../calc/weightCheck'

type Props = { submission: Submission | null; stale: boolean }

export const ResultsSummary = ({ submission, stale }: Props) => {
  if (submission === null) return <p className="sheet-meta">Enter the child's weight, then press Submit.</p>
  if (stale) return <p className="sheet-meta stale">Age or weight changed. Press Submit to update the rates.</p>
  const weightKg = validWeight(submission)
  if (weightKg === null) return <p className="sheet-meta">Enter a valid weight to see rates.</p>
  return (
    <p className="sheet-meta">
      Rates for <b>{formatWeight(weightKg)} kg</b>
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
