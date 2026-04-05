import React from 'react';

const EXPORT_FORMATS = [
  { fmt: 'json',       label: 'Workspace JSON',  sub: 'Raw config · for other tools',      color: 'from-violet-500 to-fuchsia-600', shadow: 'shadow-violet-500/25' },
  { fmt: 'markdown',   label: 'Markdown zip',    sub: 'GFM · drop into Confluence / mark', color: 'from-slate-500 to-slate-600',    shadow: 'shadow-slate-500/20' },
  { fmt: 'mkdocs',     label: 'MkDocs zip',      sub: 'Includes mkdocs.yml',               color: 'from-teal-500 to-cyan-600',      shadow: 'shadow-teal-500/25' },
  { fmt: 'docusaurus', label: 'Docusaurus zip',  sub: 'Frontmatter + sidebars.js',         color: 'from-blue-500 to-indigo-600',    shadow: 'shadow-blue-500/25' },
  { fmt: 'csv',        label: 'Data dictionary', sub: 'CSV · opens in Excel & Sheets',     color: 'from-emerald-500 to-green-600',  shadow: 'shadow-emerald-500/25' },
];

export default function Hub({
  setWorkspaceView,
  exportWorkspace,
  masterConfig,
  renameValue, setRenameValue,
  isRenaming, setIsRenaming,
  renameWorkspace, duplicateWorkspace, deleteWorkspace,
}) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <p className="text-center text-xs font-bold uppercase tracking-[0.25em] text-violet-400 mb-3">
        Where to start
      </p>
      <h1 className="text-center text-3xl sm:text-4xl font-black text-white tracking-tight mb-2">
        Choose a focus
      </h1>
      <p className="text-center text-slate-400 max-w-lg mx-auto mb-12 text-sm">
        Work on events, the parameter library, or read generated Markdown documentation.
      </p>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
        <button
          type="button"
          onClick={() => setWorkspaceView('events-list')}
          className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-8 text-left text-white shadow-xl shadow-indigo-900/40 transition hover:scale-[1.02] hover:shadow-indigo-500/20"
        >
          <span className="text-xs font-black uppercase tracking-widest opacity-80">Events</span>
          <h2 className="mt-2 text-2xl font-black">Events</h2>
          <p className="mt-2 text-sm text-white/85 leading-relaxed">
            List and edit measurement events, apply GA4 templates, and attach parameters.
          </p>
          <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-xs font-bold backdrop-blur group-hover:bg-white/30">
            Open events →
          </span>
        </button>
        <button
          type="button"
          onClick={() => setWorkspaceView('parameters-list')}
          className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 p-8 text-left text-white shadow-xl shadow-amber-900/40 transition hover:scale-[1.02] hover:shadow-amber-500/20"
        >
          <span className="text-xs font-black uppercase tracking-widest opacity-80">Library</span>
          <h2 className="mt-2 text-2xl font-black">Parameters</h2>
          <p className="mt-2 text-sm text-white/85 leading-relaxed">
            Edit global definitions and see every event that references each key.
          </p>
          <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-xs font-bold backdrop-blur group-hover:bg-white/30">
            Open parameters →
          </span>
        </button>
        <button
          type="button"
          onClick={() => setWorkspaceView('wiki')}
          className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 p-8 text-left text-white shadow-xl shadow-emerald-900/40 transition hover:scale-[1.02] hover:shadow-emerald-500/20 sm:col-span-2 lg:col-span-1"
        >
          <span className="text-xs font-black uppercase tracking-widest opacity-80">Docs</span>
          <h2 className="mt-2 text-2xl font-black">Wiki</h2>
          <p className="mt-2 text-sm text-white/85 leading-relaxed">
            Implementation guide generated from your workspace — event pages and the master dictionary.
          </p>
          <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-xs font-bold backdrop-blur group-hover:bg-white/30">
            View wiki →
          </span>
        </button>
      </div>

      <div className="mt-12 rounded-[2rem] border border-white/10 bg-white/[0.04] backdrop-blur-sm p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Export workspace</p>
        <p className="text-sm text-slate-400 mb-6">Download your workspace data or a ready-to-use wiki package.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {EXPORT_FORMATS.map(({ fmt, label, sub, color, shadow }) => (
            <button
              key={fmt}
              type="button"
              onClick={() => exportWorkspace(fmt)}
              className={`rounded-2xl bg-gradient-to-br ${color} p-5 text-left shadow-lg ${shadow} hover:opacity-90 transition`}
            >
              <p className="text-sm font-black text-white">{label}</p>
              <p className="mt-1 text-xs text-white/70">{sub}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] backdrop-blur-sm p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Workspace settings</p>
        <p className="text-sm text-slate-400 mb-6">Rename, duplicate, or delete this workspace.</p>
        {isRenaming ? (
          <div className="flex gap-3">
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') renameWorkspace();
                if (e.key === 'Escape') { setIsRenaming(false); setRenameValue(''); }
              }}
              placeholder="New workspace name"
              className="flex-grow rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm font-semibold text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-violet-500"
            />
            <button type="button" onClick={renameWorkspace} className="rounded-2xl bg-violet-600 px-5 py-3 text-xs font-black text-white hover:bg-violet-500 transition">Save</button>
            <button type="button" onClick={() => { setIsRenaming(false); setRenameValue(''); }} className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-xs font-bold text-slate-300 hover:bg-white/10 transition">Cancel</button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => { setRenameValue(masterConfig.meta?.name || ''); setIsRenaming(true); }}
              className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-xs font-bold text-slate-200 hover:bg-white/10 transition"
            >
              Rename
            </button>
            <button
              type="button"
              onClick={duplicateWorkspace}
              className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 px-5 py-3 text-xs font-bold text-cyan-200 hover:bg-cyan-500/20 transition"
            >
              Duplicate
            </button>
            <button
              type="button"
              onClick={deleteWorkspace}
              className="rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-3 text-xs font-bold text-red-300 hover:bg-red-500/20 transition"
            >
              Delete workspace
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
