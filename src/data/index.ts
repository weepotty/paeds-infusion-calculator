import raw from '../../drugs.yaml?raw'
import { loadDataOrThrow } from './load'

export const data = loadDataOrThrow(raw)
