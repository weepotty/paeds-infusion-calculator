import type { AmountUnit } from '../data/types'

export const unitFamily = (unit: AmountUnit): 'mass' | 'units' => (unit === 'units' ? 'units' : 'mass')
