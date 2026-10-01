import { formatWeight } from '../calc/format'
import { type Safeguarding, safeguardingDetail } from '../calc/weightCheck'
import { FlagIcon } from './FlagIcon'
import './Safeguarding.css'

type Props = { safeguarding: Safeguarding }

export const SafeguardingFlag = ({ safeguarding }: Props) => (
  <div className="sg-flag" role="note">
    <FlagIcon />
    <div>
      <strong>Safeguarding flag</strong>
      <p>{`${safeguardingDetail(safeguarding)} Proceeding with ${formatWeight(safeguarding.weightKg)} kg.`}</p>
    </div>
  </div>
)
