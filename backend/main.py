import os
import json
import re
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

# CORS for React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CONFIG_FILE = "master_config.json"
WIKI_DIR = "wiki_output"

# 1. Helper: Load/Save the Master State
def load_config():
    if not os.path.exists(CONFIG_FILE):
        return {"events": [], "global_parameters": {}}
    with open(CONFIG_FILE, "r") as f:
        return json.load(f)

def save_config(config):
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=2)

# 2. The Compiler: Turns JSON State into Markdown Files
def compile_wiki():
    config = load_config()
    if not os.path.exists(WIKI_DIR):
        os.makedirs(WIKI_DIR)
    
    # Generate Event Pages
    for event in config['events']:
        md = f"# Event: {event['name']}\n\n{event.get('description', '')}\n\n"
        md += "| Key | Type | Req | Description |\n|:---|:---|:---|:---|\n"
        
        for p in event['parameters']:
            # Pull definition from Global Library if it exists
            global_def = config['global_parameters'].get(p['key'], {})
            desc = p.get('description') or global_def.get('description', 'TBD')
            req = "✅" if p['required'] else "❌"
            md += f"| `{p['key']}` | {p['type']} | {req} | {desc} |\n"
        
        with open(f"{WIKI_DIR}/{event['name']}.md", "w") as f:
            f.write(md)

    # Generate Master Dictionary Page
    dict_md = "# Master Parameter Dictionary\n\n"
    dict_md += "| Parameter | Description | Global Type |\n|:---|:---|:---|\n"
    for key, data in config['global_parameters'].items():
        dict_md += f"| `{key}` | {data['description']} | {data['type']} |\n"
    
    with open(f"{WIKI_DIR}/_master_dictionary.md", "w") as f:
        f.write(dict_md)

# 3. API Models
class Parameter(BaseModel):
    key: str
    type: str = "string"
    required: bool = True
    description: Optional[str] = ""

class EventSchema(BaseModel):
    name: str
    description: str = ""
    parameters: List[Parameter]

# 4. Endpoints
@app.post("/events/save")
async def save_event_to_master(event: EventSchema):
    config = load_config()
    
    # Update or Add the Event
    new_event = event.dict()
    # Check if event already exists and update it, else append
    config['events'] = [e for e in config['events'] if e['name'] != event.name]
    config['events'].append(new_event)
    
    # Automatically Register New Parameters to Global Library
    for p in event.parameters:
        if p.key not in config['global_parameters']:
            config['global_parameters'][p.key] = {
                "description": p.description or "Auto-registered",
                "type": p.type
            }
            
    save_config(config)
    compile_wiki() # Trigger a re-build of the docs instantly
    return {"message": f"Successfully updated {event.name} and rebuilt Wiki."}

@app.get("/config")
async def get_full_config():
    return load_config()

# Add this endpoint to your main.py
@app.get("/templates")
async def get_templates():
    if not os.path.exists("ga4_standards.json"):
        return {}
    with open("ga4_standards.json", "r") as f:
        return json.load(f)