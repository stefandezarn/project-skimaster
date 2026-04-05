import { useMemo } from 'react';

export default function EventEditor({
  selectedSidebarEventName,
  eventName, setEventName,
  description, setDescription,
  category, setCategory, existingCategories,
  parameters,
  templates, libraryKeys,
  templateSelectReset,
  applyTemplate, addParameter, updateParameter, removeParameter, saveEvent,
  setWorkspaceView,
}) {
  const paramSuggestions = useMemo(() => {
    const ga4Keys = Object.values(templates || {})
      .flat()
      .flatMap((t) => (t.parameters || []).map((p) => p.key))
      .filter(Boolean);
    return Array.from(new Set([...libraryKeys, ...ga4Keys])).sort();
  }, [templates, libraryKeys]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <button
        type="button"
        onClick={() => setWorkspaceView('events-list')}
        className="mb-6 text-sm font-bold text-violet-400 hover:text-violet-300"
      >
        ← All events
      </button>

      <section className="mb-8 rounded-3xl border border-white/10 bg-gradient-to-r from-indigo-600/40 to-violet-600/30 p-6 backdrop-blur-sm">
        <label className="block text-xs font-black uppercase tracking-widest text-violet-200 mb-3">
          Quick-apply GA4 template
        </label>
        <select
          key={templateSelectReset}
          className="w-full rounded-2xl border border-white/20 bg-slate-900/60 px-4 py-3 text-sm font-semibold text-white outline-none focus:ring-2 focus:ring-violet-400"
          onChange={(e) => e.target.value && applyTemplate(e.target.value)}
          defaultValue=""
        >
          <option value="" className="text-slate-900">— Choose template —</option>
          {Object.keys(templates || {}).filter((c) => c !== 'item_parameters_reference').map((category) => (
            <optgroup key={category} label={category.replace(/_/g, ' ').toUpperCase()} className="text-slate-900">
              {(templates[category] || []).filter((t) => !t.name.startsWith('_')).map((t) => (
                <option key={t.name} value={JSON.stringify({ ...t, category })}>{t.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </section>

      <div className="rounded-[2rem] border border-white/10 bg-white/[0.06] backdrop-blur-md shadow-xl p-8 sm:p-10">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-1">
              {selectedSidebarEventName ? 'Saved event' : 'New event'}
            </p>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {selectedSidebarEventName ? `"${selectedSidebarEventName}"` : 'New event'}
            </h2>
            <p className="text-slate-400 text-sm mt-2 max-w-xl">
              Set the description and configure parameters. Add rows for each payload field.
            </p>
          </div>
        </header>

        {selectedSidebarEventName && eventName !== selectedSidebarEventName && (
          <p className="text-xs text-amber-200 bg-amber-500/20 border border-amber-400/30 rounded-xl px-4 py-3 mb-6">
            Renaming to <span className="font-mono font-bold">{eventName || '…'}</span> replaces the old event name on save.
          </p>
        )}

        <div className="space-y-8">
          <div>
            <label className="text-xs font-black uppercase text-slate-500 mb-2 block">Event name</label>
            <input
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-3 text-lg font-bold text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="e.g. purchase"
            />
          </div>
          <div>
            <label className="text-xs font-black uppercase text-slate-500 mb-2 block">Description & notes</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-3 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-violet-500 resize-y min-h-[100px]"
              placeholder="When this fires, context for implementers…"
            />
          </div>

          <div>
            <label className="text-xs font-black uppercase text-slate-500 mb-2 block">Category</label>
            <input
              list="category-suggestions"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. ecommerce"
              className="w-full rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-3 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-violet-500"
            />
            <datalist id="category-suggestions">
              {Array.from(new Set([
                ...existingCategories,
                ...Object.keys(templates || {}).filter((c) => c !== 'item_parameters_reference'),
              ])).sort().map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>

          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Parameters on this event</h3>
              <button
                type="button"
                onClick={addParameter}
                className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-xs font-black uppercase tracking-wide text-white shadow-lg shadow-cyan-500/20 hover:opacity-95 transition"
              >
                + Add parameter
              </button>
            </div>
            <div className="space-y-4">
              {parameters.map((param, index) => (
                <div key={index} className="rounded-2xl border border-white/10 bg-slate-900/40 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
                    <div className="flex-grow space-y-3 min-w-0">
                      <input
                        list={`ga4-keys-${index}`}
                        value={param.key}
                        placeholder="Parameter key"
                        className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 font-mono text-sm font-semibold text-white outline-none focus:ring-2 focus:ring-violet-500"
                        onChange={(e) => updateParameter(index, 'key', e.target.value)}
                      />
                      <datalist id={`ga4-keys-${index}`}>
                        {paramSuggestions.map((key) => (
                          <option key={key} value={key} />
                        ))}
                      </datalist>
                      <div className="flex flex-wrap gap-4">
                        <select
                          value={param.type}
                          className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-xs font-bold text-slate-200 outline-none"
                          onChange={(e) => updateParameter(index, 'type', e.target.value)}
                        >
                          <option value="string">String</option>
                          <option value="number">Number</option>
                          <option value="boolean">Boolean</option>
                        </select>
                        <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300">
                          <input
                            type="checkbox"
                            checked={param.required}
                            className="rounded border-slate-500 text-violet-500 focus:ring-violet-500"
                            onChange={(e) => updateParameter(index, 'required', e.target.checked)}
                          />
                          Required
                        </label>
                      </div>
                      <input
                        value={param.description || ''}
                        onChange={(e) => updateParameter(index, 'description', e.target.value)}
                        placeholder="Optional note for this event"
                        className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-xs text-slate-300 outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeParameter(index)}
                      className="shrink-0 h-fit rounded-xl border border-red-400/40 bg-red-500/20 px-4 py-2 text-xs font-bold text-red-200 hover:bg-red-500/30"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={saveEvent}
            className="w-full rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-600 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-violet-500/30 hover:opacity-95 transition"
          >
            Save event & rebuild wiki
          </button>
        </div>
      </div>
    </div>
  );
}
