import { expect, it } from 'vitest'
import raw from '../../drugs.yaml?raw'
import { loadData } from './load'

it('drugs.yaml is valid', () => {
  const result = loadData(raw)
  expect(result.ok ? [] : result.errors).toEqual([])
})
