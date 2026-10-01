import { WholeNumberInput } from '@/components/shared/WholeNumberInput'

// Price / money fields use whole units (10 → 11 → 12), not 0.01 steps.
// Kept as an alias so older imports stay valid.
export function MoneyInput(props) {
  return <WholeNumberInput {...props} />
}

export default MoneyInput
