
export default function ParameterDetail({
  selectedParamKey, setSelectedParamKey,
  paramCatalog,
  paramEditType, setParamEditType,
  paramEditDescription, setParamEditDescription,
  paramEditScope, setParamEditScope,
  paramEditSendTo, setParamEditSendTo,
  saveParameterDefinition, openEventByName,
  setWorkspaceView,
}) {
  const row = paramCatalog.find((r) => r.key === selectedParamKey);
  const used = row?.used_by || [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <button
        type="button"
        onClick={() => { setSelectedParamKey(null); setWorkspaceView('parameters-list'); }}
        className="mb-6 text-sm font-bold text-amber-300 hover:text-amber-200"
      >
        ← All parameters
      </button>

      <div className="rounded-[2rem] border border-amber-400/20 bg-gradient-to-b from-amber-950/30 to-slate-900/80 backdrop-blur-md p-8 sm:p-10 shadow-xl">
        <h1 className="text-3xl font-black font-mono text-amber-100">{selectedParamKey}</h1>
        <p className="mt-3 text-sm text-slate-400 max-w-2xl">
          Global type and description for this key. Event-specific required flags and notes are edited on each event.
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div>
            <label className="text-xs font-black uppercase text-slate-500 block mb-2">Global type</label>
            <select
              value={paramEditType}
              onChange={(e) => setParamEditType(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="string">String</option>
              <option value="number">Number</option>
              <option value="boolean">Boolean</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-black uppercase text-slate-500 block mb-2">Scope</label>
            <select
              value={paramEditScope}
              onChange={(e) => setParamEditScope(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="event">Event — top-level dataLayer param</option>
              <option value="ecommerce">Ecommerce — inside ecommerce object</option>
              <option value="item">Item — inside ecommerce.items[ ]</option>
              <option value="user">User — user-level / user property</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-black uppercase text-slate-500 block mb-2">Send to (GTM)</label>
            <select
              value={paramEditSendTo}
              onChange={(e) => setParamEditSendTo(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="event_param">Event param — push with each dataLayer.push()</option>
              <option value="config_param">Config param — set once in GTM config tag</option>
              <option value="user_property">User property — sent as GA4 user property</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-black uppercase text-slate-500 block mb-2">Global description</label>
            <textarea
              value={paramEditDescription}
              onChange={(e) => setParamEditDescription(e.target.value)}
              rows={5}
              className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-amber-500 resize-y min-h-[120px]"
              placeholder="Meaning, format, examples…"
            />
          </div>
        </div>

        <div className="mt-10">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Linked events</h3>
          {used.length === 0 ? (
            <p className="text-sm text-slate-500 border border-dashed border-white/15 rounded-2xl p-8 text-center">
              Not used on any event yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {used.map((u, idx) => (
                <li
                  key={`${u.event}-${idx}`}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/40 px-4 py-3"
                >
                  <div>
                    <span className="font-semibold text-white">{u.event}</span>
                    <span className={`ml-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      u.required ? 'bg-violet-500/30 text-violet-200' : 'bg-slate-600/50 text-slate-300'
                    }`}>
                      {u.required ? 'Required' : 'Optional'}
                    </span>
                    {u.event_description && (
                      <p className="text-xs text-slate-400 mt-1">{u.event_description}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => openEventByName(u.event)}
                    className="shrink-0 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2 text-xs font-bold text-white"
                  >
                    Open event
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="button"
          onClick={saveParameterDefinition}
          className="mt-10 w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-amber-500/25 hover:opacity-95 transition"
        >
          Save master definition
        </button>
      </div>
    </div>
  );
}
