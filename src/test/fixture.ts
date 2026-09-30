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
