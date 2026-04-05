import React, { useState, useEffect, useCallback } from 'react';

import Landing from './components/Landing';
import TopBar from './components/TopBar';
import Hub from './components/Hub';
import EventsList from './components/EventsList';
import EventEditor from './components/EventEditor';
import ParametersList from './components/ParametersList';
import ParameterDetail from './components/ParameterDetail';
import WikiViewer from './components/WikiViewer';

const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:8000').replace(/\/$/, '');
const WORKSPACE_STORAGE_KEY = 'analytics_workspace_id';

function App() {
  const [workspaceId, setWorkspaceId] = useState(
    () => localStorage.getItem(WORKSPACE_STORAGE_KEY) || ''
  );
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [workspacesList, setWorkspacesList] = useState([]);
  const [renameValue, setRenameValue] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  const [workspaceView, setWorkspaceView] = useState('hub');

  const [eventName, setEventName] = useState('');
  const [description, setDescription] = useState('');
  const [parameters, setParameters] = useState([
    { key: '', type: 'string', required: true, description: '', scope: 'event', send_to: 'event_param' },
  ]);
  const [category, setCategory] = useState('');
  const [selectedSidebarEventName, setSelectedSidebarEventName] = useState(null);
  const [templateSelectReset, setTemplateSelectReset] = useState(0);

  const [paramCatalog, setParamCatalog] = useState([]);
  const [selectedParamKey, setSelectedParamKey] = useState(null);
  const [paramEditType, setParamEditType] = useState('string');
  const [paramEditDescription, setParamEditDescription] = useState('');
  const [paramEditScope, setParamEditScope] = useState('event');
  const [paramEditSendTo, setParamEditSendTo] = useState('event_param');

  const [masterConfig, setMasterConfig] = useState({ events: [], global_parameters: {}, meta: {} });
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
      if (res.ok) setWorkspacesList(await res.json());
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
      if (configRes.ok) setMasterConfig(await configRes.json() || { events: [], global_parameters: {}, meta: {} });

      const tempRes = await fetch(`${API_BASE}/templates`);
      if (tempRes.ok) setTemplates(await tempRes.json() || {});

      const libRes = await fetch(`${API_BASE}/workspaces/${workspaceId}/library-keys`);
      if (libRes.ok) setLibraryKeys(await libRes.json() || []);

      const catRes = await fetch(`${API_BASE}/workspaces/${workspaceId}/parameters-catalog`);
      if (catRes.ok) setParamCatalog(await catRes.json() || []);
    } catch (err) {
      console.error('Initialization failed. Is the backend running?', err);
    }
  }, [workspaceId]);

  useEffect(() => { fetchWorkspaceList(); }, [fetchWorkspaceList]);
  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  const fetchWikiPages = useCallback(async () => {
    if (!workspaceId) return null;
    setWikiListLoading(true);
    try {
      const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/wiki/pages`);
      if (!res.ok) throw new Error(await res.text());
      const pages = (await res.json()).pages || [];
      setWikiPages(pages);
      let nextFile = null;
      setSelectedWikiFile((prev) => {
        nextFile = prev && pages.some((p) => p.file === prev) ? prev : pages[0]?.file ?? null;
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

  const fetchWikiContent = useCallback(async (filename) => {
    if (!workspaceId || !filename) { setWikiMarkdown(''); return; }
    setWikiContentLoading(true);
    try {
      const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/wiki/content/${encodeURIComponent(filename)}`);
      if (!res.ok) throw new Error('Failed to load');
      setWikiMarkdown((await res.json()).markdown || '');
    } catch (e) {
      console.error(e);
      setWikiMarkdown('*Could not load this wiki page.*');
    } finally {
      setWikiContentLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (workspaceView === 'wiki' && workspaceId) fetchWikiPages();
  }, [workspaceView, workspaceId, fetchWikiPages]);

  useEffect(() => {
    if (workspaceView === 'wiki' && selectedWikiFile) fetchWikiContent(selectedWikiFile);
  }, [workspaceView, selectedWikiFile, fetchWikiContent]);

  // ── Workspace actions ─────────────────────────────────────────────────────

  const createWorkspace = async () => {
    try {
      const res = await fetch(`${API_BASE}/workspaces`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newWorkspaceName.trim() || null }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      localStorage.setItem(WORKSPACE_STORAGE_KEY, data.id);
      setWorkspaceId(data.id);
      setNewWorkspaceName('');
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
    setCategory('');
    setParameters([{ key: '', type: 'string', required: true, description: '', scope: 'event', send_to: 'event_param' }]);
    setSelectedSidebarEventName(null);
    setSelectedParamKey(null);
    setWorkspaceView('hub');
  };

  const renameWorkspace = async () => {
    const name = renameValue.trim();
    if (!name || !workspaceId) return;
    try {
      const res = await fetch(`${API_BASE}/workspaces/${workspaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || res.statusText);
      setIsRenaming(false);
      setRenameValue('');
      fetchAllData();
      fetchWorkspaceList();
    } catch (err) {
      alert(`Rename failed: ${err.message}`);
    }
  };

  const duplicateWorkspace = async () => {
    if (!workspaceId) return;
    try {
      const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error((await res.json()).detail || res.statusText);
      const data = await res.json();
      fetchWorkspaceList();
      switchWorkspace(data.id);
    } catch (err) {
      alert(`Duplicate failed: ${err.message}`);
    }
  };

  const deleteWorkspace = async () => {
    if (!workspaceId) return;
    const name = masterConfig.meta?.name || 'this workspace';
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_BASE}/workspaces/${workspaceId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).detail || res.statusText);
      openLanding();
      fetchWorkspaceList();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const exportWorkspace = async (fmt) => {
    if (!workspaceId) return;
    try {
      const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/export?fmt=${fmt}`);
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${workspaceTitle.replace(/\s+/g, '_')}-${fmt}.${fmt === 'json' ? 'json' : fmt === 'csv' ? 'csv' : 'zip'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    }
  };

  // ── Event actions ─────────────────────────────────────────────────────────

  const loadToForm = (item) => {
    if (!item) return;
    setEventName(item.name || '');
    setDescription(item.description || '');
    setCategory(item.category || '');
    const params = (item.parameters || []).map((p) => ({
      key: p.key || '',
      type: p.type || 'string',
      required: p.required !== false,
      description: p.description || '',
      scope: p.scope || 'event',
      send_to: p.send_to || 'event_param',
    }));
    setParameters(params.length ? params : [{ key: '', type: 'string', required: true, description: '' }]);
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
    setCategory('');
    setParameters([{ key: '', type: 'string', required: true, description: '', scope: 'event', send_to: 'event_param' }]);
    setWorkspaceView('event-editor');
  };

  const applyTemplate = (json) => {
    loadToForm(JSON.parse(json));
    setSelectedSidebarEventName(null);
    setSelectedParamKey(null);
    setTemplateSelectReset((n) => n + 1);
  };

  const addParameter = () =>
    setParameters((prev) => [...prev, { key: '', type: 'string', required: true, description: '', scope: 'event', send_to: 'event_param' }]);

  const updateParameter = (index, field, value) =>
    setParameters((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));

  const removeParameter = (index) =>
    setParameters((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length ? next : [{ key: '', type: 'string', required: true, description: '', scope: 'event', send_to: 'event_param' }];
    });

  const deleteEvent = async () => {
    if (!workspaceId || !selectedSidebarEventName) return;
    if (!window.confirm(`Delete event "${selectedSidebarEventName}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(
        `${API_BASE}/workspaces/${workspaceId}/events/${encodeURIComponent(selectedSidebarEventName)}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error((await res.json()).detail || res.statusText);
      fetchAllData();
      setWorkspaceView('events-list');
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const duplicateEvent = async () => {
    if (!workspaceId || !selectedSidebarEventName) return;
    try {
      const res = await fetch(
        `${API_BASE}/workspaces/${workspaceId}/events/${encodeURIComponent(selectedSidebarEventName)}/duplicate`,
        { method: 'POST' }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || res.statusText);
      await fetchAllData();
      const newEvt = masterConfig.events.find((e) => e.name === data.new_name)
        || { name: data.new_name, description: '', category: '', parameters: [] };
      setSelectedSidebarEventName(data.new_name);
      loadToForm({ ...newEvt, name: data.new_name });
    } catch (err) {
      alert(`Duplicate failed: ${err.message}`);
    }
  };

  const addItemParams = () => {
    const itemParams = templates?.item_parameters_reference?.[0]?.parameters || [];
    if (!itemParams.length) return;
    setParameters((prev) => {
      const existingKeys = new Set(prev.map((p) => p.key));
      const toAdd = itemParams
        .filter((p) => !existingKeys.has(p.key))
        .map((p) => ({
          key: p.key,
          type: p.type || 'string',
          required: p.required !== false,
          description: p.description || '',
          scope: p.scope || 'item',
          send_to: 'event_param',
        }));
      return [...prev.filter((p) => p.key !== ''), ...toAdd];
    });
  };

  const saveEvent = async () => {
    if (!eventName) return alert('Event Name is required.');
    if (!workspaceId) return alert('No workspace selected.');
    try {
      const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/events/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: eventName, description, category, parameters }),
      });
      const data = await res.json();
      if (!res.ok) {
        const d = data.detail;
        throw new Error(
          typeof d === 'string' ? d
          : Array.isArray(d) ? d.map((x) => x.msg || JSON.stringify(x)).join('; ')
          : data.message || res.statusText
        );
      }
      alert(data.message);
      setSelectedSidebarEventName(eventName);
      fetchAllData();
    } catch (err) {
      alert(`Error saving: ${err.message}`);
    }
  };

  // ── Parameter actions ─────────────────────────────────────────────────────

  const openParameterDetail = (row) => {
    if (!row?.key) return;
    setSelectedSidebarEventName(null);
    setSelectedParamKey(row.key);
    setParamEditType(row.type || 'string');
    setParamEditDescription(row.description || '');
    setParamEditScope(row.scope || 'event');
    setParamEditSendTo(row.send_to || 'event_param');
    setWorkspaceView('parameter-detail');
  };

  const openEventByName = (name) => {
    const evt = (masterConfig.events || []).find((e) => e.name === name);
    if (!evt) { alert('Event not found. Try refreshing.'); return; }
    openEventInEditor(evt);
  };

  const createParameter = async ({ key, type, scope, send_to, description }) => {
    if (!workspaceId) return false;
    try {
      const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/parameters`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: key.trim(), type, scope, send_to, description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || res.statusText);
      fetchAllData();
      return true;
    } catch (err) {
      alert(`Error creating parameter: ${err.message}`);
      return false;
    }
  };

  const deleteParameter = async () => {
    if (!workspaceId || !selectedParamKey) return;
    if (!window.confirm(`Delete parameter "${selectedParamKey}"? It will be removed from all events. This cannot be undone.`)) return;
    try {
      const res = await fetch(
        `${API_BASE}/workspaces/${workspaceId}/parameters/${encodeURIComponent(selectedParamKey)}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error((await res.json()).detail || res.statusText);
      fetchAllData();
      setSelectedParamKey(null);
      setWorkspaceView('parameters-list');
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const renameParameter = async (newKey) => {
    if (!workspaceId || !selectedParamKey || !newKey.trim()) return;
    try {
      const res = await fetch(
        `${API_BASE}/workspaces/${workspaceId}/parameters/${encodeURIComponent(selectedParamKey)}/rename`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ new_key: newKey.trim() }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || res.statusText);
      setSelectedParamKey(data.new_key);
      fetchAllData();
    } catch (err) {
      alert(`Rename failed: ${err.message}`);
    }
  };

const saveParameterDefinition = async () => {
    if (!workspaceId) return alert('No workspace selected.');
    if (!selectedParamKey) return;
    try {
      const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/parameters`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: selectedParamKey,
          type: paramEditType,
          description: paramEditDescription,
          scope: paramEditScope,
          send_to: paramEditSendTo,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const d = data.detail;
        throw new Error(
          typeof d === 'string' ? d
          : Array.isArray(d) ? d.map((x) => x.msg || JSON.stringify(x)).join('; ')
          : data.message || res.statusText
        );
      }
      alert(data.message);
      fetchAllData();
    } catch (err) {
      alert(`Error saving parameter: ${err.message}`);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (!workspaceId) {
    return (
      <Landing
        workspacesList={workspacesList}
        newWorkspaceName={newWorkspaceName}
        setNewWorkspaceName={setNewWorkspaceName}
        createWorkspace={createWorkspace}
        switchWorkspace={switchWorkspace}
      />
    );
  }

  const workspaceTitle = masterConfig.meta?.name || 'Workspace';
  const events = masterConfig.events || [];

  const views = {
    'events-list':     <EventsList events={events} openEventInEditor={openEventInEditor} startNewEvent={startNewEvent} setWorkspaceView={setWorkspaceView} />,
    'event-editor':    <EventEditor selectedSidebarEventName={selectedSidebarEventName} eventName={eventName} setEventName={setEventName} description={description} setDescription={setDescription} category={category} setCategory={setCategory} existingCategories={Array.from(new Set(events.map((e) => e.category).filter(Boolean))).sort()} parameters={parameters} templates={templates} libraryKeys={libraryKeys} templateSelectReset={templateSelectReset} applyTemplate={applyTemplate} addParameter={addParameter} addItemParams={addItemParams} updateParameter={updateParameter} removeParameter={removeParameter} saveEvent={saveEvent} deleteEvent={deleteEvent} duplicateEvent={duplicateEvent} setWorkspaceView={setWorkspaceView} />,
    'parameters-list': <ParametersList paramCatalog={paramCatalog} openParameterDetail={openParameterDetail} setWorkspaceView={setWorkspaceView} createParameter={createParameter} />,
    'parameter-detail':<ParameterDetail selectedParamKey={selectedParamKey} setSelectedParamKey={setSelectedParamKey} paramCatalog={paramCatalog} paramEditType={paramEditType} setParamEditType={setParamEditType} paramEditDescription={paramEditDescription} setParamEditDescription={setParamEditDescription} paramEditScope={paramEditScope} setParamEditScope={setParamEditScope} paramEditSendTo={paramEditSendTo} setParamEditSendTo={setParamEditSendTo} saveParameterDefinition={saveParameterDefinition} deleteParameter={deleteParameter} renameParameter={renameParameter} openEventByName={openEventByName} setWorkspaceView={setWorkspaceView} />,
    'wiki':            <WikiViewer wikiPages={wikiPages} selectedWikiFile={selectedWikiFile} setSelectedWikiFile={setSelectedWikiFile} wikiMarkdown={wikiMarkdown} wikiListLoading={wikiListLoading} wikiContentLoading={wikiContentLoading} setWorkspaceView={setWorkspaceView} />,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 font-sans text-slate-100">
      <TopBar workspaceTitle={workspaceTitle} workspaceView={workspaceView} setWorkspaceView={setWorkspaceView} workspacesList={workspacesList} workspaceId={workspaceId} switchWorkspace={switchWorkspace} openLanding={openLanding} setSelectedParamKey={setSelectedParamKey} />
      {views[workspaceView] ?? (
        <Hub setWorkspaceView={setWorkspaceView} exportWorkspace={exportWorkspace} masterConfig={masterConfig} renameValue={renameValue} setRenameValue={setRenameValue} isRenaming={isRenaming} setIsRenaming={setIsRenaming} renameWorkspace={renameWorkspace} duplicateWorkspace={duplicateWorkspace} deleteWorkspace={deleteWorkspace} />
      )}
    </div>
  );
}

export default App;
