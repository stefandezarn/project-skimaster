import { useState } from 'react';

const EMPTY_FORM = { key: '', type: 'string', scope: 'event', send_to: 'event_param', description: '' };

export default function ParametersList({ paramCatalog, openParameterDetail, setWorkspaceView, createParameter }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSave = async () => {
    if (!form.key.trim()) return;
    setSaving(true);
    const ok = await createParameter(form);
    setSaving(false);
    if (ok) { setForm(EMPTY_FORM); setShowForm(false); }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <button
        type="button"
        onClick={() => setWorkspaceView('hub')}
        className="mb-6 text-sm font-bold text-amber-300 hover:text-amber-200"
      >
        ← Back to home
      </button>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Master parameters</h1>
          <p className="mt-2 text-slate-400 text-sm max-w-lg">
            Select a key to edit its global definition and see linked events.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="shrink-0 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-3 text-sm font-black uppercase tracking-wide text-slate-950 shadow-lg shadow-amber-500/25 hover:opacity-95 transition"
        >
          {showForm ? 'Cancel' : '+ New parameter'}
        </button>
      </div>

      {showForm && (
        <div className="mb-8 rounded-[2rem] border border-amber-400/20 bg-gradient-to-b from-amber-950/30 to-slate-900/80 p-6 sm:p-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-amber-300 mb-6">New parameter</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-xs font-black uppercase text-slate-500 block mb-2">Key <span className="text-red-400">*</span></label>
              <input
                autoFocus
                value={form.key}
                onChange={(e) => set('key', e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                placeholder="e.g. user_id"
                className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 font-mono text-sm font-semibold text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="text-xs font-black uppercase text-slate-500 block mb-2">Type</label>
              <select value={form.type} onChange={(e) => set('type', e.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-amber-500">
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-black uppercase text-slate-500 block mb-2">Scope</label>
              <select value={form.scope} onChange={(e) => set('scope', e.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-amber-500">
                <option value="event">Event — top-level dataLayer param</option>
                <option value="ecommerce">Ecommerce — inside ecommerce object</option>
                <option value="item">Item — inside ecommerce.items[ ]</option>
                <option value="user">User — user-level / user property</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-black uppercase text-slate-500 block mb-2">Send to (GTM)</label>
              <select value={form.send_to} onChange={(e) => set('send_to', e.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm font-bold text-white outline-none focus:ring-2 focus:ring-amber-500">
                <option value="event_param">Event param — push with each dataLayer.push()</option>
                <option value="config_param">Config param — set once in GTM config tag</option>
                <option value="user_property">User property — sent as GA4 user property</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-black uppercase text-slate-500 block mb-2">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={3}
                placeholder="Meaning, format, examples…"
                className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-amber-500 resize-y"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={!form.key.trim() || saving}
            className="mt-6 w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-amber-500/25 hover:opacity-95 disabled:opacity-40 transition"
          >
            {saving ? 'Saving…' : 'Save parameter'}
          </button>
        </div>
      )}

      {paramCatalog.length === 0 && !showForm ? (
        <div className="rounded-3xl border border-dashed border-white/20 bg-white/[0.03] p-12 text-center text-slate-400">
          No parameters yet — create one above or save an event that references a key.
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
                      row.scope === 'item'       ? 'bg-cyan-500/20 text-cyan-300' :
                      row.scope === 'ecommerce'  ? 'bg-orange-500/20 text-orange-300' :
                                                   'bg-purple-500/20 text-purple-300'
                    }`}>
                      {row.scope === 'item' ? 'items[ ]' : row.scope === 'ecommerce' ? 'ecommerce' : 'user'}
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
