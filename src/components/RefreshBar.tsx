type Props = {
  loading: boolean
  lastFetchedAt?: number
  error?: string | null
  onRefresh: () => void
}

export function RefreshBar({ loading, lastFetchedAt, error, onRefresh }: Props) {
  const fetchedLabel = lastFetchedAt
    ? new Date(lastFetchedAt).toLocaleString('vi-VN')
    : 'Chưa cập nhật'

  return (
    <div className="border-line bg-surface/92 mb-4 flex flex-col items-stretch gap-3 rounded-[14px] border px-4 py-3.5 shadow-[0_18px_40px_rgba(26,20,16,0.18)] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1 text-[0.92rem]">
        <span>Lần lấy giá: {fetchedLabel}</span>
        {error ? <span className="text-down font-semibold">{error}</span> : null}
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className="from-accent to-accent-2 w-full cursor-pointer rounded-[10px] border-0 bg-linear-to-br px-4 py-2.5 text-[0.95rem] font-bold text-[#fff8ef] disabled:cursor-wait disabled:opacity-65 sm:w-auto"
      >
        {loading ? 'Đang cập nhật…' : 'Refresh giá'}
      </button>
    </div>
  )
}
