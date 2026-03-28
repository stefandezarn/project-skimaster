import React, { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:8000').replace(
  /\/$/,
  ''
);

const WORKSPACE_STORAGE_KEY = 'analytics_workspace_id';

const wikiMdComponents = {
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
    <a
      href={href}
      className="text-cyan-400 underline hover:text-cyan-300 font-medium"
      target="_blank"
      rel="noreferrer"
    >
      {children}
    </a>
  ),
};

function App() {
  const [workspaceId, setWorkspaceId] = useState(
    () => localStorage.getItem(WORKSPACE_STORAGE_KEY) || ''
  );
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [workspacesList, setWorkspacesList] = useState([]);

  const [workspaceView, setWorkspaceView] = useState('hub');

  const [eventName, setEventName] = useState('');
  const [description, setDescription] = useState('');
  const [parameters, setParameters] = useState([
    { key: '', type: 'string', required: true, description: '' },
  ]);

  const [selectedSidebarEventName, setSelectedSidebarEventName] = useState(null);
  const [templateSelectReset, setTemplateSelectReset] = useState(0);

  const [paramCatalog, setParamCatalog] = useState([]);
  const [selectedParamKey, setSelectedParamKey] = useState(null);
  const [paramEditType, setParamEditType] = useState('string');
  const [paramEditDescription, setParamEditDescription] = useState('');

  const [masterConfig, setMasterConfig] = useState({
    events: [],
    global_parameters: {},
    meta: {},
  });
  const [templates, setTemplates] = useState({});
  const [libraryKeys, setLibraryKeys] = useState([]);

  const [wikiPages, setWikiPages] = useState([]);
  const [selectedWikiFile, setSelectedWikiFile] = useState(null);
  const [wikiMarkdown, setWikiMarkdown] = useState('');
  const [wikiListLoading, setWikiListLoading] = useState(false);
  const [wikiContentLoading, setWikiContentLoading] = useState(false);

  useEffect(() => {
    if (workspaceId) setWorkspaceView('hub');
  }, [workspaceId]);

  const fetchWorkspaceList = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/workspaces`);
      if (res.ok) {
        const data = await res.json();
        setWorkspacesList(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to list workspaces', err);
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const configRes = await fetch(`${API_BASE}/workspaces/${workspaceId}/config`);
      if (configRes.status === 404) {
        localStorage.removeItem(WORKSPACE_STORAGE_KEY);
        setWorkspaceId('');
        return;
      }
      if (configRes.ok) {
        const configData = await configRes.json();
        setMasterConfig(
          configData || { events: [], global_parameters: {}, meta: {} }
        );
      }

      const tempRes = await fetch(`${API_BASE}/templates`);
      if (tempRes.ok) {
        const tempData = await tempRes.json();
        setTemplates(tempData || {});
      }

      const libRes = await fetch(`${API_BASE}/workspaces/${workspaceId}/library-keys`);
      if (libRes.ok) {
        const libData = await libRes.json();
        setLibraryKeys(Array.isArray(libData) ? libData : []);
      }

      const catRes = await fetch(`${API_BASE}/workspaces/${workspaceId}/parameters-catalog`);
      if (catRes.ok) {
        const catData = await catRes.json();
        setParamCatalog(Array.isArray(catData) ? catData : []);
      }
    } catch (err) {
      console.error('Initialization failed. Is the backend running?', err);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchWorkspaceList();
  }, [fetchWorkspaceList]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const fetchWikiPages = useCallback(async () => {
    if (!workspaceId) return null;
    setWikiListLoading(true);
    try {
      const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/wiki/pages`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const pages = data.pages || [];
      setWikiPages(pages);
      let nextFile = null;
      setSelectedWikiFile((prev) => {
        nextFile =
          prev && pages.some((p) => p.file === prev) ? prev : pages[0]?.file ?? null;
        return nextFile;
      });
      return nextFile;
    } catch (e) {
      console.error(e);
      setWikiPages([]);
      setSelectedWikiFile(null);
      return null;
    } finally {
      setWikiListLoading(false);
    }
  }, [workspaceId]);

  const fetchWikiContent = useCallback(
    async (filename) => {
      if (!workspaceId || !filename) {
        setWikiMarkdown('');
        return;
      }
      setWikiContentLoading(true);
      try {
        const res = await fetch(
          `${API_BASE}/workspaces/${workspaceId}/wiki/content/${encodeURIComponent(filename)}`
        );
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        setWikiMarkdown(data.markdown || '');
      } catch (e) {
        console.error(e);
        setWikiMarkdown('*Could not load this wiki page.*');
      } finally {
        setWikiContentLoading(false);
      }
    },
    [workspaceId]
  );

  useEffect(() => {
    if (workspaceView === 'wiki' && workspaceId) {
      fetchWikiPages();
    }
  }, [workspaceView, workspaceId, fetchWikiPages]);

  useEffect(() => {
    if (workspaceView === 'wiki' && selectedWikiFile) {
      fetchWikiContent(selectedWikiFile);
    }
  }, [workspaceView, selectedWikiFile, fetchWikiContent]);

  const createWorkspace = async () => {
    try {
      const res = await fetch(`${API_BASE}/workspaces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newWorkspaceName.trim() || null,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || res.statusText);
      }
      const data = await res.json();
      localStorage.setItem(WORKSPACE_STORAGE_KEY, data.id);
      setWorkspaceId(data.id);
      setNewWorkspaceName('');
      setWorkspaceView('hub');
      fetchWorkspaceList();
    } catch (err) {
      alert(`Could not create workspace: ${err.message}`);
    }
  };

  const openLanding = () => {
    localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    setWorkspaceId('');
  };

  const switchWorkspace = (id) => {
    if (!id || id === workspaceId) return;
    localStorage.setItem(WORKSPACE_STORAGE_KEY, id);
    setWorkspaceId(id);
    setEventName('');
    setDescription('');
    setParameters([{ key: '', type: 'string', required: true, description: '' }]);
    setSelectedSidebarEventName(null);
    setSelectedParamKey(null);
    setWorkspaceView('hub');
  };

  const loadToForm = (item) => {
    if (!item) return;
    setEventName(item.name || '');
    setDescription(item.description || '');
    const params = item.parameters || [{ key: '', type: 'string', required: true, description: '' }];
    const normalized = params.map((p) => ({
      key: p.key || '',
      type: p.type || 'string',
      required: p.required !== false,
      description: p.description || '',
    }));
    setParameters(
      normalized.length
        ? normalized
        : [{ key: '', type: 'string', required: true, description: '' }]
    );
  };

  const openEventInEditor = (evt) => {
    setSelectedParamKey(null);
    setSelectedSidebarEventName(evt.name);
    loadToForm(evt);
    setWorkspaceView('event-editor');
  };

  const startNewEvent = () => {
    setSelectedSidebarEventName(null);
    setSelectedParamKey(null);
    setEventName('');
    setDescription('');
    setParameters([{ key: '', type: 'string', required: true, description: '' }]);
    setWorkspaceView('event-editor');
  };

  const openParameterDetail = (row) => {
    if (!row?.key) return;
    setSelectedSidebarEventName(null);
    setSelectedParamKey(row.key);
    setParamEditType(row.type || 'string');
    setParamEditDescription(row.description || '');
    setWorkspaceView('parameter-detail');
  };

  const openEventByName = (name) => {
    const evt = (masterConfig.events || []).find((e) => e.name === name);
    if (!evt) {
      alert('Event not found. Try refreshing.');
      return;
    }
    openEventInEditor(evt);
  };

  const saveParameterDefinition = async () => {
    if (!workspaceId) return alert('No workspace selected.');
    if (!selectedParamKey) return;
    try {
      const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/parameters`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: selectedParamKey,
          type: paramEditType,
          description: paramEditDescription,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        const d = data.detail;
        const msg =
          typeof d === 'string'
            ? d
            : Array.isArray(d)
              ? d.map((x) => x.msg || JSON.stringify(x)).join('; ')
              : data.message || response.statusText;
        throw new Error(msg);
      }
      alert(data.message);
      fetchAllData();
    } catch (error) {
      alert(`Error saving parameter: ${error.message}`);
    }
  };

  const addParameter = () => {
    setParameters([...parameters, { key: '', type: 'string', required: true, description: '' }]);
  };

  const updateParameter = (index, field, value) => {
    const newParams = [...parameters];
    newParams[index][field] = value;
    setParameters(newParams);
  };

  const removeParameter = (index) => {
    const newParams = parameters.filter((_, i) => i !== index);
    setParameters(
      newParams.length > 0
        ? newParams
        : [{ key: '', type: 'string', required: true, description: '' }]
    );
  };

  const saveEvent = async () => {
    if (!eventName) return alert('Event Name is required.');
    if (!workspaceId) return alert('No workspace selected.');

    const payload = { name: eventName, description, parameters };
    try {
      const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/events/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        const d = data.detail;
        const msg =
          typeof d === 'string'
            ? d
            : Array.isArray(d)
              ? d.map((x) => x.msg || JSON.stringify(x)).join('; ')
              : data.message || response.statusText;
        throw new Error(msg);
      }
      alert(data.message);
      setSelectedSidebarEventName(eventName);
      fetchAllData();
    } catch (error) {
      alert(`Error saving: ${error.message}`);
    }
  };

  const applyTemplate = (json) => {
    loadToForm(JSON.parse(json));
    setSelectedSidebarEventName(null);
    setSelectedParamKey(null);
    setTemplateSelectReset((n) => n + 1);
  };

  /* ——— Landing (no workspace) ——— */
  if (!workspaceId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 font-sans text-slate-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.07] backdrop-blur-xl shadow-2xl p-10 space-y-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300 mb-2">
              Analytics Architect
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
                <option value="" disabled className="text-slate-900">
                  Choose…
                </option>
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

  const workspaceTitle = masterConfig.meta?.name || 'Workspace';
  const events = masterConfig.events || [];

  const topBar = (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 shrink-0 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-lg shadow-violet-500/30" />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400">Analytics Architect</p>
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
              onClick={() => {
                setWorkspaceView('hub');
                setSelectedParamKey(null);
              }}
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

  /* ——— Hub ——— */
  const renderHub = () => (
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
    </div>
  );

  /* ——— Events list ——— */
  const renderEventsList = () => (
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
        <div className="grid gap-4 sm:grid-cols-2">
          {events.map((evt) => (
            <button
              key={evt.name}
              type="button"
              onClick={() => openEventInEditor(evt)}
              className="rounded-2xl border-2 border-indigo-400/30 bg-gradient-to-b from-indigo-950/50 to-slate-900/80 p-6 text-left transition hover:border-violet-400 hover:shadow-lg hover:shadow-violet-500/10"
            >
              <span className="text-lg font-bold text-white">{evt.name}</span>
              {evt.description ? (
                <p className="mt-2 text-sm text-slate-400 line-clamp-2">{evt.description}</p>
              ) : (
                <p className="mt-2 text-sm text-slate-500 italic">No description yet</p>
              )}
              <p className="mt-4 text-xs font-bold uppercase tracking-wider text-violet-400">
                {(evt.parameters || []).length} parameter{(evt.parameters || []).length === 1 ? '' : 's'} →
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  /* ——— Event editor ——— */
  const renderEventEditor = () => (
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
          <option value="" className="text-slate-900">
            — Choose template —
          </option>
          {Object.keys(templates || {}).map((category) => (
            <optgroup key={category} label={category.toUpperCase()} className="text-slate-900">
              {(templates[category] || []).map((t) => (
                <option key={t.name} value={JSON.stringify(t)}>
                  {t.name}
                </option>
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
              {selectedSidebarEventName ? `“${selectedSidebarEventName}”` : 'New event'}
            </h2>
            <p className="text-slate-400 text-sm mt-2 max-w-xl">
              Set the description and configure parameters. Add rows for each payload field.
            </p>
          </div>
        </header>

        {selectedSidebarEventName && eventName !== selectedSidebarEventName && (
          <p className="text-xs text-amber-200 bg-amber-500/20 border border-amber-400/30 rounded-xl px-4 py-3 mb-6">
            Renaming to <span className="font-mono font-bold">{eventName || '…'}</span> replaces the old
            event name on save.
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
            <label className="text-xs font-black uppercase text-slate-500 mb-2 block">
              Description & notes
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-3 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-violet-500 resize-y min-h-[100px]"
              placeholder="When this fires, context for implementers…"
            />
          </div>

          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">
                Parameters on this event
              </h3>
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
                <div
                  key={index}
                  className="rounded-2xl border border-white/10 bg-slate-900/40 p-5"
                >
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
                        {libraryKeys.map((key) => (
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

  /* ——— Parameters list ——— */
  const renderParametersList = () => (
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
                <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-amber-400/90">
                  {n} event{n === 1 ? '' : 's'}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  /* ——— Wiki viewer ——— */
  const renderWiki = () => (
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
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={wikiMdComponents}>
              {wikiMarkdown}
            </ReactMarkdown>
          )}
        </article>
      </div>
    </div>
  );

  /* ——— Parameter detail ——— */
  const renderParameterDetail = () => {
    const row = paramCatalog.find((r) => r.key === selectedParamKey);
    const used = row?.used_by || [];

    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <button
          type="button"
          onClick={() => {
            setSelectedParamKey(null);
            setWorkspaceView('parameters-list');
          }}
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
            <div className="sm:col-span-2">
              <label className="text-xs font-black uppercase text-slate-500 block mb-2">
                Global description
              </label>
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
                      <span
                        className={`ml-2 text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          u.required ? 'bg-violet-500/30 text-violet-200' : 'bg-slate-600/50 text-slate-300'
                        }`}
                      >
                        {u.required ? 'Required' : 'Optional'}
                      </span>
                      {u.event_description ? (
                        <p className="text-xs text-slate-400 mt-1">{u.event_description}</p>
                      ) : null}
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
  };

  let mainContent;
  switch (workspaceView) {
    case 'events-list':
      mainContent = renderEventsList();
      break;
    case 'event-editor':
      mainContent = renderEventEditor();
      break;
    case 'parameters-list':
      mainContent = renderParametersList();
      break;
    case 'parameter-detail':
      mainContent = renderParameterDetail();
      break;
    case 'wiki':
      mainContent = renderWiki();
      break;
    default:
      mainContent = renderHub();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 font-sans text-slate-100">
      {topBar}
      {mainContent}
    </div>
  );
}

export default App;
