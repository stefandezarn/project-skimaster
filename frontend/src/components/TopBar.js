
export default function TopBar({ workspaceTitle, workspaceView, setWorkspaceView, workspacesList, workspaceId, switchWorkspace, openLanding, setSelectedParamKey }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 shrink-0 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-lg shadow-violet-500/30" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400">Schemantics</p>
            <p className="text-sm font-semibold text-white truncate">{workspaceTitle}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setWorkspaceView('wiki')}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              workspaceView === 'wiki'
                ? 'bg-emerald-500/35 text-emerald-100 ring-1 ring-emerald-400/50'
                : 'border border-emerald-400/30 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
            }`}
          >
            Wiki
          </button>
          {workspaceView !== 'hub' && (
            <button
              type="button"
              onClick={() => { setWorkspaceView('hub'); setSelectedParamKey(null); }}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-white/10 transition"
            >
              ← Home
            </button>
          )}
          {workspacesList.length > 0 && (
            <select
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white outline-none max-w-[140px]"
              value={workspaceId}
              onChange={(e) => switchWorkspace(e.target.value)}
            >
              {workspacesList.map((w) => (
                <option key={w.id} value={w.id} className="text-slate-900">
                  {w.name || w.id.slice(0, 8)}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={openLanding}
            className="rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 px-4 py-2 text-xs font-bold text-white shadow-md hover:opacity-95 transition"
          >
            Exit
          </button>
        </div>
      </div>
    </header>
  );
}
