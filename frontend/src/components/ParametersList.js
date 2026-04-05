import React from 'react';

export default function ParametersList({ paramCatalog, openParameterDetail, setWorkspaceView }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <button
        type="button"
        onClick={() => setWorkspaceView('hub')}
        className="mb-6 text-sm font-bold text-amber-300 hover:text-amber-200"
      >
        ← Back to home
      </button>
      <h1 className="text-3xl font-black text-white tracking-tight">Master parameters</h1>
      <p className="mt-2 text-slate-400 text-sm max-w-lg mb-10">
        Select a key to edit its global definition and see linked events. New keys are added when you save events.
      </p>

      {paramCatalog.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/20 bg-white/[0.03] p-12 text-center text-slate-400">
          No parameters yet. Define events first.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {paramCatalog.map((row) => {
            const n = (row.used_by || []).length;
            return (
              <button
                key={row.key}
                type="button"
                onClick={() => openParameterDetail(row)}
                className="rounded-2xl border-2 border-amber-400/25 bg-gradient-to-b from-amber-950/40 to-slate-900/60 p-5 text-left transition hover:border-amber-400/60 hover:shadow-lg hover:shadow-amber-500/10"
              >
                <span className="font-mono text-sm font-bold text-amber-100">{row.key}</span>
                <p className="mt-2 text-xs text-slate-400 line-clamp-2">
                  {row.description || 'No global description'}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {row.scope && row.scope !== 'event' && (
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      row.scope === 'item' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-purple-500/20 text-purple-300'
                    }`}>
                      {row.scope === 'item' ? 'items[ ]' : 'user'}
                    </span>
                  )}
                  {row.send_to && row.send_to !== 'event_param' && (
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      row.send_to === 'config_param' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-violet-500/20 text-violet-300'
                    }`}>
                      {row.send_to === 'config_param' ? 'config' : 'user prop'}
                    </span>
                  )}
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90">
                    {n} event{n === 1 ? '' : 's'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
