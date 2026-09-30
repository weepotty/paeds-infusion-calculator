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
