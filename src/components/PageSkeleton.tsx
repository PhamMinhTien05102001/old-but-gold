/** Layout-matching skeleton while gold prices load (avoids empty-state flash). */
export function PageSkeleton() {
  return (
    <section
      className="border-line bg-surface animate-pulse rounded-2xl border px-4 pt-4 pb-5 shadow-[0_18px_40px_rgba(26,20,16,0.18)] sm:px-[1.15rem]"
      aria-busy="true"
      aria-label="Đang tải dữ liệu giá"
    >
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="bg-surface-2 h-7 w-40 rounded-md" />
          <div className="bg-surface-2 h-4 w-64 max-w-full rounded-md" />
        </div>
        <div className="bg-surface-2 h-10 w-52 rounded-full" />
      </header>

      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3">
        <div className="border-line bg-surface-2 h-30 rounded-xl border" />
        <div className="border-line bg-surface-2 h-30 rounded-xl border" />
      </div>

      <div className="border-line bg-surface-2 mb-4 h-24 rounded-xl border" />
      <div className="bg-surface-2 mb-3 h-5 w-48 rounded-md" />
      <div className="border-line bg-surface-2 h-80 rounded-xl border" />
    </section>
  )
}
