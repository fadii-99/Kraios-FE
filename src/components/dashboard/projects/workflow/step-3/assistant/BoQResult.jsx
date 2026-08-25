import BoQTable from '@/components/dashboard/projects/workflow/step-3/assistant/BoQTable'
import { cn } from '@/lib/cn'

/**
 * The BoQ Result component rendered inside the assistant message block.
 * Treats the structured BOQ table with the same visual prominence that Step 2
 * gives the generated 3D image.
 */
export default function BoQResult({
  result,
  onAddRow,
  onDeleteRow,
  className,
}) {
  if (!result) return null

  return (
    <div className={cn('relative w-full max-w-[42rem] my-1', className)}>
      <BoQTable
        result={result}
        onAddRow={onAddRow}
        onDeleteRow={onDeleteRow}
      />
    </div>
  )
}

