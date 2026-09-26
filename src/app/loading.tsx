/** Shown at once while a page is prepared on the server, so a tap always answers immediately. */
export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <div className="skeleton h-44 rounded-[28px]" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="skeleton h-28 rounded-3xl" />
        <div className="skeleton h-28 rounded-3xl" />
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="skeleton h-16 rounded-2xl" />
      ))}
    </div>
  );
}
