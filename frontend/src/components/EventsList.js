
function EventCard({ evt, onClick }) {
  const paramCount = (evt.parameters || []).length;
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border-2 border-indigo-400/30 bg-gradient-to-b from-indigo-950/50 to-slate-900/80 p-6 text-left transition hover:border-violet-400 hover:shadow-lg hover:shadow-violet-500/10"
    >
      <span className="text-lg font-bold text-white">{evt.name}</span>
      {evt.description ? (
        <p className="mt-2 text-sm text-slate-400 line-clamp-2">{evt.description}</p>
      ) : (
        <p className="mt-2 text-sm text-slate-500 italic">No description yet</p>
      )}
      <p className="mt-4 text-xs font-bold uppercase tracking-wider text-violet-400">
        {paramCount} parameter{paramCount === 1 ? '' : 's'} →
      </p>
    </button>
  );
}

export default function EventsList({ events, openEventInEditor, startNewEvent, setWorkspaceView }) {
  // Group events by category; uncategorized last
  const grouped = events.reduce((acc, evt) => {
    const key = evt.category?.trim() || '';
    (acc[key] = acc[key] || []).push(evt);
    return acc;
  }, {});

  const categories = Object.keys(grouped)
    .filter((k) => k !== '')
    .sort();
  if (grouped['']) categories.push('');

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <button
        type="button"
        onClick={() => setWorkspaceView('hub')}
        className="mb-6 text-sm font-bold text-violet-400 hover:text-violet-300"
      >
        ← Back to home
      </button>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Events</h1>
          <p className="mt-2 text-slate-400 text-sm max-w-md">
            Select an event to view its description and parameters, or create a new one.
          </p>
        </div>
        <button
          type="button"
          onClick={startNewEvent}
          className="shrink-0 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 px-6 py-3 text-sm font-black uppercase tracking-wide text-slate-950 shadow-lg shadow-emerald-500/25 hover:opacity-95 transition"
        >
          + Add new event
        </button>
      </div>

      {events.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/20 bg-white/[0.03] p-12 text-center">
          <p className="text-slate-400 mb-6">No events yet — add your first event.</p>
          <button
            type="button"
            onClick={startNewEvent}
            className="rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 px-8 py-3 text-sm font-bold text-slate-950"
          >
            + Add new event
          </button>
        </div>
      ) : (
        <div className="space-y-10">
          {categories.map((cat) => (
            <div key={cat || '__uncategorized__'}>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 border-b border-white/5 pb-2">
                {cat || 'Uncategorized'}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {grouped[cat].map((evt) => (
                  <EventCard key={evt.name} evt={evt} onClick={() => openEventInEditor(evt)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
