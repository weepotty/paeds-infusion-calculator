import { formatWeight } from '../calc/format'
import { type Safeguarding, safeguardingDetail } from '../calc/weightCheck'

type Props = { safeguarding: Safeguarding }

export const SafeguardingFlag = ({ safeguarding }: Props) => (
  <div className="sg-flag" role="note">
    <span className="sg-icon" aria-hidden="true">
      !
    </span>
    <div>
      <strong>Safeguarding flag</strong>
      <p>{`${safeguardingDetail(safeguarding)} Proceeding with ${formatWeight(safeguarding.weightKg)} kg.`}</p>
    </div>
  </div>
)
