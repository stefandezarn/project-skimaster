import React, { useState, useEffect } from 'react';

function App() {
  // --- STATE MANAGEMENT ---
  const [eventName, setEventName] = useState('');
  const [description, setDescription] = useState('');
  const [parameters, setParameters] = useState([{ key: '', type: 'string', required: true }]);
  
  const [masterConfig, setMasterConfig] = useState({ events: [], global_parameters: {} });
  const [templates, setTemplates] = useState({});
  const [libraryKeys, setLibraryKeys] = useState([]);

  // --- API HANDLERS ---
  
  const fetchAllData = async () => {
    try {
      // 1. Fetch Master Config (Current State)
      const configRes = await fetch('http://localhost:8000/config');
      if (configRes.ok) {
        const configData = await configRes.json();
        setMasterConfig(configData || { events: [], global_parameters: {} });
      }

      // 2. Fetch GA4 Templates
      const tempRes = await fetch('http://localhost:8000/templates');
      if (tempRes.ok) {
        const tempData = await tempRes.json();
        setTemplates(tempData || {});
      }

      // 3. Fetch Global Keys for Autocomplete
      const libRes = await fetch('http://localhost:8000/library-keys');
      if (libRes.ok) {
        const libData = await libRes.json();
        // Force libData to be an array to prevent the .map() crash
        setLibraryKeys(Array.isArray(libData) ? libData : []);
      }
    } catch (err) {
      console.error("Initialization failed. Is the backend running?", err);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // --- UI LOGIC ---

  const loadToForm = (item) => {
    if (!item) return;
    setEventName(item.name || '');
    setDescription(item.description || '');
    setParameters(item.parameters || [{ key: '', type: 'string', required: true }]);
  };

  const addParameter = () => {
    setParameters([...parameters, { key: '', type: 'string', required: true }]);
  };

  const updateParameter = (index, field, value) => {
    const newParams = [...parameters];
    newParams[index][field] = value;
    setParameters(newParams);
  };

  const removeParameter = (index) => {
    const newParams = parameters.filter((_, i) => i !== index);
    setParameters(newParams.length > 0 ? newParams : [{ key: '', type: 'string', required: true }]);
  };

  const saveEvent = async () => {
    if (!eventName) return alert("Event Name is required.");
    
    const payload = { name: eventName, description, parameters };
    try {
      const response = await fetch('http://localhost:8000/events/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      alert(data.message);
      fetchAllData(); // Refresh sidebar and keys after saving
    } catch (error) {
      alert("Error saving: Check if the backend container is running.");
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* SIDEBAR: Saved Workspace */}
      <aside className="w-72 bg-white border-r border-slate-200 p-6 flex flex-col shadow-sm">
        <div className="mb-8">
          <h1 className="text-xl font-black text-indigo-600 tracking-tight italic uppercase">Analytics Architect</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Stefan DeZarn Labs</p>
        </div>

        <nav className="flex-grow overflow-y-auto">
          <h2 className="text-[10px] font-bold uppercase text-slate-400 mb-4 tracking-widest">Workspace Events</h2>
          <div className="space-y-1">
            {(masterConfig.events || []).length === 0 && <p className="text-xs text-slate-400 italic">No events saved.</p>}
            {(masterConfig.events || []).map((evt) => (
              <button 
                key={evt.name}
                onClick={() => loadToForm(evt)}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 text-sm font-semibold transition group flex justify-between items-center"
              >
                {evt.name}
                <span className="opacity-0 group-hover:opacity-100 text-[10px] bg-indigo-100 px-1.5 rounded">Load</span>
              </button>
            ))}
          </div>
        </nav>
      </aside>

      {/* MAIN CONTENT: The Form */}
      <main className="flex-grow p-12">
        <div className="max-w-4xl mx-auto">
          
          {/* Template Selector Section */}
          <section className="mb-8 bg-indigo-600 p-6 rounded-2xl shadow-xl shadow-indigo-100 text-white">
            <label className="block text-sm font-bold mb-2 opacity-80">Quick-Apply GA4 Recommended Templates</label>
            <select 
              className="w-full p-3 rounded-lg bg-indigo-500 border-none text-white font-medium focus:ring-2 ring-white outline-none cursor-pointer"
              onChange={(e) => e.target.value && loadToForm(JSON.parse(e.target.value))}
            >
              <option value="">-- Choose a Standard Event --</option>
              {Object.keys(templates || {}).map(category => (
                <optgroup key={category} label={category.toUpperCase()} className="text-slate-900 bg-white">
                  {templates[category].map(t => (
                    <option key={t.name} value={JSON.stringify(t)}>{t.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </section>

          {/* Builder Form */}
          <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm">
            <header className="mb-10 flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Event Configuration</h2>
                <p className="text-slate-500 mt-1">Define triggers and expected parameters.</p>
              </div>
              <button 
                onClick={() => { setEventName(''); setDescription(''); setParameters([{ key: '', type: 'string', required: true }]); }}
                className="text-xs font-bold text-slate-400 hover:text-indigo-600"
              >
                Clear Form
              </button>
            </header>

            <div className="space-y-8">
              {/* Event Metadata */}
              <div className="grid grid-cols-2 gap-8">
                <div className="flex flex-col">
                  <label className="text-xs font-black uppercase text-slate-400 mb-2">Event Name</label>
                  <input 
                    value={eventName} 
                    onChange={(e) => setEventName(e.target.value)} 
                    placeholder="e.g., file_download" 
                    className="border-b-2 border-slate-100 p-2 text-lg font-bold focus:border-indigo-500 outline-none transition"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-black uppercase text-slate-400 mb-2">Context / Description</label>
                  <input 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    placeholder="Purpose of this event" 
                    className="border-b-2 border-slate-100 p-2 text-lg focus:border-indigo-500 outline-none transition" 
                  />
                </div>
              </div>

              {/* Parameter Rows */}
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Parameters</h3>
                  <button onClick={addParameter} className="bg-slate-900 text-white text-[10px] px-3 py-1.5 rounded-full font-bold hover:bg-indigo-600 transition">+ ADD PARAMETER</button>
                </div>
                
                <div className="space-y-3">
                  {parameters.map((param, index) => (
                    <div key={index} className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 items-center">
                      <div className="flex-grow">
                        <input 
                          list="ga4-keys-autocomplete"
                          value={param.key}
                          placeholder="Key (e.g. currency)" 
                          className="w-full bg-transparent font-mono text-sm font-bold outline-none"
                          onChange={(e) => updateParameter(index, 'key', e.target.value)}
                        />
                        {/* The Guarded Map here prevents the crash */}
                        <datalist id="ga4-keys-autocomplete">
                          {(libraryKeys || []).map(key => <option key={key} value={key} />)}
                        </datalist>
                      </div>
                      
                      <select 
                        value={param.type}
                        className="bg-transparent text-xs font-bold text-slate-500 outline-none"
                        onChange={(e) => updateParameter(index, 'type', e.target.value)}
                      >
                        <option value="string">STRING</option>
                        <option value="number">NUMBER</option>
                        <option value="boolean">BOOLEAN</option>
                      </select>

                      <div className="flex items-center gap-2 border-l pl-4">
                        <span className="text-[10px] font-black text-slate-300 uppercase">Req?</span>
                        <input 
                          type="checkbox" 
                          checked={param.required} 
                          className="w-4 h-4 accent-indigo-600"
                          onChange={(e) => updateParameter(index, 'required', e.target.checked)} 
                        />
                      </div>

                      <button onClick={() => removeParameter(index)} className="text-slate-300 hover:text-red-500 ml-2">×</button>
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={saveEvent} 
                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-sm tracking-widest hover:bg-indigo-600 transition shadow-2xl shadow-indigo-100"
              >
                SYNC WORKSPACE & REBUILD DOCUMENTATION
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;