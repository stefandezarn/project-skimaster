
export default function Landing({ workspacesList, newWorkspaceName, setNewWorkspaceName, createWorkspace, switchWorkspace }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 font-sans text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.07] backdrop-blur-xl shadow-2xl p-10 space-y-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300 mb-2">
            Schemantics
          </p>
          <h1 className="text-3xl font-black tracking-tight text-white">Your workspace</h1>
          <p className="text-sm text-slate-300 mt-3 leading-relaxed">
            Open or create a workspace to define GA4-style events, a shared parameter library,
            and auto-generated wiki docs.
          </p>
        </div>

        <div className="space-y-4">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">
            New workspace name (optional)
          </label>
          <input
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
            placeholder="e.g. Marketing site"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-violet-500"
          />
          <button
            type="button"
            onClick={createWorkspace}
            className="w-full rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-violet-500/30 hover:from-violet-400 hover:to-fuchsia-400 transition"
          >
            Create workspace
          </button>
        </div>

        {workspacesList.length > 0 && (
          <div className="pt-6 border-t border-white/10">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              Open existing
            </label>
            <select
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white outline-none focus:ring-2 focus:ring-violet-500"
              defaultValue=""
              onChange={(e) => switchWorkspace(e.target.value)}
            >
              <option value="" disabled className="text-slate-900">Choose…</option>
              {workspacesList.map((w) => (
                <option key={w.id} value={w.id} className="text-slate-900">
                  {w.name || w.id}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
