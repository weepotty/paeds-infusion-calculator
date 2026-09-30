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
import { type RegisterUpdates, UpdateBanner } from './components/UpdateBanner'
import type { AppData } from './data/types'

type Props = { data: AppData; registerUpdates?: RegisterUpdates }

const noUpdates: RegisterUpdates = () => {}

export const App = ({ data, registerUpdates = noUpdates }: Props) => {
  const [acknowledged, setAcknowledged] = useState(false)
  const [submission, setSubmission] = useState<Submission | null>(null)
  const [stale, setStale] = useState(false)
  const [proceeded, setProceeded] = useState(false)
  const [doses, setDoses] = useState(() => startDoses(data.drugs))
  const [submitCount, setSubmitCount] = useState(0)
  const weightInputRef = useRef<HTMLInputElement>(null)

  const check = submission === null ? null : submission.check
  const safeguarding = check !== null && check.ok ? check.safeguarding : null
  const masked = safeguarding !== null && !proceeded

  const submit = (patient: PatientInput) => {
    setSubmission({ ...patient, check: checkWeight(patient, data) })
    setStale(false)
    setProceeded(false)
    setDoses(startDoses(data.drugs))
    setSubmitCount(count => count + 1)
  }

  const changeWeight = () => {
    weightInputRef.current?.focus()
    weightInputRef.current?.select()
  }

  return (
    <>
      <UpdateBanner registerUpdates={registerUpdates} />
      {acknowledged ? null : <Disclaimer disclaimer={data.disclaimer} onAcknowledge={() => setAcknowledged(true)} />}
      <div data-testid="page" inert={!acknowledged}>
        <Banner text={data.prototypeBanner} />
        <header className="bar">
          <div className="bar-inner">
            <div className="brand">
              <img className="brand-icon" src={`${import.meta.env.BASE_URL}icon.svg`} alt="" width={28} height={28} />
              <span>
                <strong>Paeds Infusion Calculator</strong> · PICU and transfer
              </span>
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
              key={submitCount}
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
