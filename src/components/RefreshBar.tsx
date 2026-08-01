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
    <div className="refresh-bar">
      <div className="refresh-meta">
        <span>Lần lấy giá: {fetchedLabel}</span>
        {error ? <span className="error-text">{error}</span> : null}
      </div>
      <button type="button" className="btn-primary" onClick={onRefresh} disabled={loading}>
        {loading ? 'Đang cập nhật…' : 'Refresh giá'}
      </button>
    </div>
  )
}
