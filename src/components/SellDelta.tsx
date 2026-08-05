import { ArrowDown, ArrowUp } from 'lucide-react'
import { formatTimeAgo, formatVnd } from '../lib/normalize'

type Props = {
  delta: number
  /** Epoch ms of the most recent source update (age vs now). */
  updatedAt?: number | null
  className?: string
}

/** Sell delta with age since last update, e.g. ↓ 20.000đ · 15 phút trước */
export function SellDelta({ delta, updatedAt, className = '' }: Props) {
  if (!delta) return null

  const ago = updatedAt != null ? formatTimeAgo(updatedAt) : null

  return (
    <span
      className={[
        'inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-semibold',
        delta > 0 ? 'text-up' : 'text-down',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="inline-flex items-center gap-0.5">
        {delta > 0 ? (
          <ArrowUp className="size-4 shrink-0" aria-hidden />
        ) : (
          <ArrowDown className="size-4 shrink-0" aria-hidden />
        )}
        {formatVnd(Math.abs(delta))}
      </span>
      {ago ? <span className="font-medium opacity-80">· {ago}</span> : null}
    </span>
  )
}
