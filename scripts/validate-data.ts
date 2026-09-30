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
