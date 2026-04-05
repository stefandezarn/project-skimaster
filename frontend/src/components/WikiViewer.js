import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const mdComponents = {
  h1: ({ children }) => (
    <h1 className="text-3xl font-black text-white mt-2 mb-4 border-b border-white/10 pb-3">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-bold text-violet-200 mt-8 mb-3">{children}</h2>
  ),
  p: ({ children }) => <p className="text-slate-300 leading-relaxed my-3">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-6 my-3 text-slate-300 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-6 my-3 text-slate-300 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
  hr: () => <hr className="border-white/10 my-8" />,
  code: ({ className, children }) => {
    const inline = !className;
    return inline ? (
      <code className="rounded bg-slate-800/80 px-1.5 py-0.5 font-mono text-sm text-amber-200">{children}</code>
    ) : (
      <code className={className}>{children}</code>
    );
  },
  pre: ({ children }) => (
    <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/80 p-4 my-4 text-sm text-slate-200">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto my-6 rounded-xl border border-white/10">
      <table className="w-full min-w-[32rem] border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-slate-800/90">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-white/5">{children}</tbody>,
  tr: ({ children }) => <tr className="hover:bg-white/[0.02]">{children}</tr>,
  th: ({ children }) => (
    <th className="border border-white/10 px-3 py-2 text-left font-bold text-violet-200">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border border-white/10 px-3 py-2 text-slate-300 align-top">{children}</td>
  ),
  a: ({ href, children }) => (
    <a href={href} className="text-cyan-400 underline hover:text-cyan-300 font-medium" target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
};

export default function WikiViewer({
  wikiPages, selectedWikiFile, setSelectedWikiFile,
  wikiMarkdown, wikiListLoading, wikiContentLoading,
  fetchWikiPages, fetchWikiContent,
  setWorkspaceView,
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <button
        type="button"
        onClick={() => setWorkspaceView('hub')}
        className="mb-6 text-sm font-bold text-emerald-400 hover:text-emerald-300"
      >
        ← Back to home
      </button>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Workspace wiki</h1>
          <p className="mt-2 text-slate-400 text-sm max-w-xl">
            Markdown generated when you save events or parameters. Use the list to switch pages.
          </p>
        </div>
        <button
          type="button"
          onClick={async () => {
            const file = await fetchWikiPages();
            if (file) await fetchWikiContent(file);
          }}
          disabled={wikiListLoading}
          className="shrink-0 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-5 py-2.5 text-xs font-bold text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
        >
          {wikiListLoading ? 'Refreshing…' : 'Refresh wiki'}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 min-h-[60vh]">
        <aside className="lg:w-64 shrink-0 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Pages</p>
          {wikiListLoading && wikiPages.length === 0 ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : wikiPages.length === 0 ? (
            <p className="text-sm text-slate-500 italic">
              No wiki yet. Save an event or parameter to generate docs.
            </p>
          ) : (
            wikiPages.map((p) => (
              <button
                key={p.file}
                type="button"
                onClick={() => setSelectedWikiFile(p.file)}
                className={`w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                  selectedWikiFile === p.file
                    ? 'bg-emerald-500/25 text-emerald-100 ring-1 ring-emerald-400/40'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-transparent'
                }`}
              >
                {p.label}
              </button>
            ))
          )}
        </aside>
        <article className="flex-grow min-w-0 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 sm:p-10 shadow-xl">
          {wikiContentLoading ? (
            <p className="text-slate-400">Loading page…</p>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
              {wikiMarkdown}
            </ReactMarkdown>
          )}
        </article>
      </div>
    </div>
  );
}
