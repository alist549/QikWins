// A labelled number in a grey tile (pool, riders, players).
function Stat({ label, value, accent }) {
  return (
    <div className="flex-1 rounded-2xl bg-surface px-3 py-2.5 min-w-0">
      <div className="text-[11px] font-medium text-muted uppercase tracking-wide">{label}</div>
      <div className={`text-lg font-bold tabular truncate ${accent ? "text-brand" : ""}`}>{value}</div>
    </div>
  );
}

export default Stat;
