import csv
import io
import json
import os
import uuid
import zipfile
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from storage import get_storage
from storage.file import normalize_workspace_document, touch_meta

app = FastAPI()

_cors_raw = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
_cors_origins = [o.strip() for o in _cors_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

WIKI_DIR = "wiki_output"
storage = get_storage()


def require_workspace_id(workspace_id: str) -> str:
    try:
        return str(uuid.UUID(workspace_id))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid workspace id")


def load_workspace_doc(workspace_id: str) -> dict:
    wid = require_workspace_id(workspace_id)
    doc = storage.get_workspace(wid)
    if doc is None:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return normalize_workspace_document(doc)


def _placeholder(key: str, param_type: str) -> str:
    wrapped = "{{" + key + "}}"
    if param_type in ("number", "boolean"):
        return wrapped
    return "'" + wrapped + "'"


def _datalayer_snippet(event: dict, global_parameters: dict) -> str:
    params = event.get("parameters", [])
    event_params, ecommerce_params, item_params, config_params, user_props = [], [], [], [], []

    for p in params:
        if p["key"] == "items":
            continue  # structural container rendered as items:[{...}] block, not a flat param
        g = global_parameters.get(p["key"], {})
        scope = p.get("scope") or g.get("scope", "event")
        send_to = p.get("send_to") or g.get("send_to", "event_param")
        ptype = p.get("type") or g.get("type", "string")
        req_comment = "  // required" if p.get("required") else "  // optional"

        if send_to == "config_param":
            config_params.append(p["key"])
        elif send_to == "user_property":
            user_props.append(p["key"])
        elif scope == "item":
            item_params.append(f"      {p['key']}: {_placeholder(p['key'], ptype)},{req_comment}")
        elif scope == "ecommerce":
            ecommerce_params.append(f"    {p['key']}: {_placeholder(p['key'], ptype)},{req_comment}")
        else:
            event_params.append(f"  {p['key']}: {_placeholder(p['key'], ptype)},{req_comment}")

    has_ecommerce_obj = bool(ecommerce_params or item_params)
    lines = []

    if has_ecommerce_obj:
        lines.append("// Clear the previous ecommerce object")
        lines.append("dataLayer.push({ ecommerce: null });\n")

    lines.append("dataLayer.push({")
    lines.append(f"  event: '{event['name']}',")
    for line in event_params:
        lines.append(line)

    if has_ecommerce_obj:
        lines.append("  ecommerce: {")
        for line in ecommerce_params:
            lines.append(line)
        if item_params:
            lines.append("    items: [{")
            for line in item_params:
                lines.append(line)
            lines.append("    }],")
        lines.append("  },")

    lines.append("});")

    snippet = "\n".join(lines)

    notes = []
    if config_params:
        notes.append(
            f"> **GTM config tag params** (set once in the GA4 Configuration tag, not in the push): "
            + ", ".join(f"`{k}`" for k in config_params)
        )
    if user_props:
        notes.append(
            f"> **User properties** (sent separately via GTM user property variable): "
            + ", ".join(f"`{k}`" for k in user_props)
        )

    result = f"## dataLayer implementation\n\n```javascript\n{snippet}\n```"
    if notes:
        result += "\n\n" + "\n\n".join(notes)
    return result


def compile_wiki(workspace_id: str, config: dict) -> None:
    wid = require_workspace_id(workspace_id)
    root = os.path.join(WIKI_DIR, wid)
    if not os.path.exists(root):
        os.makedirs(root, exist_ok=True)

    for event in config["events"]:
        category = event.get("category", "")
        category_line = f"**Category:** {category}\n\n" if category else ""
        md = f"# Event: {event['name']}\n\n{category_line}{event.get('description', '')}\n\n"
        md += "| Key | Type | Req | Scope | Send To | Description |\n|:---|:---|:---|:---|:---|:---|\n"

        for p in event["parameters"]:
            global_def = config["global_parameters"].get(p["key"], {})
            desc = p.get("description") or global_def.get("description", "TBD")
            req = "✅" if p["required"] else "❌"
            scope = p.get("scope") or global_def.get("scope", "event")
            send_to = p.get("send_to") or global_def.get("send_to", "event_param")
            scope_label = {"event": "event", "ecommerce": "ecommerce obj", "item": "ecommerce.items[ ]", "user": "user"}.get(scope, scope)
            md += f"| `{p['key']}` | {p['type']} | {req} | {scope_label} | {send_to} | {desc} |\n"

        md += "\n" + _datalayer_snippet(event, config["global_parameters"]) + "\n"

        safe_name = event["name"].replace("/", "_")
        with open(os.path.join(root, f"{safe_name}.md"), "w", encoding="utf-8") as f:
            f.write(md)

    dict_md = "# Master Parameter Dictionary\n\n"
    dict_md += "| Parameter | Type | Scope | Send To | Description |\n|:---|:---|:---|:---|:---|\n"
    for key, data in config["global_parameters"].items():
        scope = data.get("scope", "event")
        send_to = data.get("send_to", "event_param")
        scope_label = {"event": "event", "ecommerce": "ecommerce obj", "item": "ecommerce.items[ ]", "user": "user"}.get(scope, scope)
        dict_md += f"| `{key}` | {data.get('type', 'string')} | {scope_label} | {send_to} | {data.get('description', '')} |\n"

    with open(os.path.join(root, "_master_dictionary.md"), "w", encoding="utf-8") as f:
        f.write(dict_md)


def ensure_wiki_on_disk(workspace_id: str) -> str:
    """Always recompile wiki so it reflects the current workspace state."""
    wid = require_workspace_id(workspace_id)
    doc = load_workspace_doc(workspace_id)
    compile_wiki(wid, doc)
    return os.path.join(WIKI_DIR, wid)


def wiki_page_label(filename: str) -> str:
    if filename == "_master_dictionary.md":
        return "Master parameter dictionary"
    if filename.endswith(".md"):
        return filename[:-3].replace("_", " ")
    return filename


class Parameter(BaseModel):
    key: str
    type: str = "string"
    required: bool = True
    description: Optional[str] = ""
    scope: str = "event"
    send_to: str = "event_param"


class EventSchema(BaseModel):
    name: str
    description: str = ""
    category: str = ""
    parameters: List[Parameter]


class WorkspaceCreate(BaseModel):
    name: Optional[str] = None


class GlobalParameterPatch(BaseModel):
    key: str
    type: str = "string"
    description: Optional[str] = ""
    scope: str = "event"        # "event" | "item" | "user"
    send_to: str = "event_param"  # "event_param" | "config_param" | "user_property"


def build_parameters_catalog(config: dict) -> List[Dict[str, Any]]:
    gp = config.get("global_parameters") or {}
    events = config.get("events") or []
    usage: Dict[str, List[Dict[str, Any]]] = {}
    for ev in events:
        for p in ev.get("parameters") or []:
            k = (p.get("key") or "").strip()
            if not k:
                continue
            usage.setdefault(k, []).append(
                {
                    "event": ev.get("name", ""),
                    "required": bool(p.get("required", True)),
                    "event_description": (p.get("description") or "").strip(),
                }
            )

    all_keys = set(gp.keys()) | set(usage.keys())
    rows: List[Dict[str, Any]] = []
    for key in sorted(all_keys, key=str.lower):
        g = gp.get(key) or {}
        rows.append(
            {
                "key": key,
                "type": g.get("type", "string"),
                "description": g.get("description", "") or "",
                "scope": g.get("scope", "event"),
                "send_to": g.get("send_to", "event_param"),
                "used_by": usage.get(key, []),
            }
        )
    return rows


@app.post("/workspaces")
async def create_workspace(body: WorkspaceCreate):
    doc = storage.create_workspace(name=body.name)
    return {"id": doc["meta"]["id"], "name": doc["meta"].get("name")}


@app.get("/workspaces")
async def list_workspaces():
    return storage.list_workspaces()


class WorkspaceRename(BaseModel):
    name: str


class WorkspaceDuplicate(BaseModel):
    name: Optional[str] = None


@app.patch("/workspaces/{workspace_id}")
async def rename_workspace(workspace_id: str, body: WorkspaceRename):
    wid = require_workspace_id(workspace_id)
    name = (body.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    try:
        doc = storage.rename_workspace(wid, name)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return {"id": wid, "name": doc["meta"]["name"]}


@app.post("/workspaces/{workspace_id}/duplicate")
async def duplicate_workspace(workspace_id: str, body: WorkspaceDuplicate):
    wid = require_workspace_id(workspace_id)
    try:
        doc = storage.duplicate_workspace(wid, name=body.name)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return {"id": doc["meta"]["id"], "name": doc["meta"]["name"]}


@app.delete("/workspaces/{workspace_id}")
async def delete_workspace(workspace_id: str):
    wid = require_workspace_id(workspace_id)
    doc = storage.get_workspace(wid)
    if doc is None:
        raise HTTPException(status_code=404, detail="Workspace not found")
    storage.delete_workspace(wid)
    wiki_root = os.path.join(WIKI_DIR, wid)
    if os.path.isdir(wiki_root):
        import shutil
        shutil.rmtree(wiki_root, ignore_errors=True)
    return {"message": "Workspace deleted"}


@app.get("/workspaces/{workspace_id}/config")
async def get_workspace_config(workspace_id: str):
    return load_workspace_doc(workspace_id)


@app.get("/workspaces/{workspace_id}/library-keys")
async def get_library_keys(workspace_id: str):
    config = load_workspace_doc(workspace_id)
    keys = list(config.get("global_parameters", {}).keys())
    keys.sort(key=str.lower)
    return keys


@app.get("/workspaces/{workspace_id}/parameters-catalog")
async def get_parameters_catalog(workspace_id: str):
    config = load_workspace_doc(workspace_id)
    return build_parameters_catalog(config)


@app.patch("/workspaces/{workspace_id}/parameters")
async def patch_global_parameter(workspace_id: str, body: GlobalParameterPatch):
    key = (body.key or "").strip()
    if not key:
        raise HTTPException(status_code=400, detail="Parameter key is required")
    wid = require_workspace_id(workspace_id)
    doc = load_workspace_doc(workspace_id)
    doc.setdefault("global_parameters", {})
    doc["global_parameters"][key] = {
        "type": body.type,
        "description": body.description if body.description is not None else "",
        "scope": body.scope,
        "send_to": body.send_to,
    }
    touch_meta(doc)
    storage.save_workspace(wid, doc)
    compile_wiki(wid, doc)
    return {"message": f"Updated master definition for `{key}` and rebuilt wiki."}


@app.post("/workspaces/{workspace_id}/events/save")
async def save_workspace_event(workspace_id: str, event: EventSchema):
    wid = require_workspace_id(workspace_id)
    doc = load_workspace_doc(workspace_id)

    new_event = event.model_dump()
    doc["events"] = [e for e in doc["events"] if e["name"] != event.name]
    doc["events"].append(new_event)

    for p in event.parameters:
        if p.key not in doc["global_parameters"]:
            doc["global_parameters"][p.key] = {
                "description": p.description or "Auto-registered",
                "type": p.type,
                "scope": p.scope,
                "send_to": p.send_to,
            }

    touch_meta(doc)
    storage.save_workspace(wid, doc)
    compile_wiki(wid, doc)
    return {"message": f"Successfully updated {event.name} and rebuilt Wiki."}


@app.delete("/workspaces/{workspace_id}/events/{event_name}")
async def delete_workspace_event(workspace_id: str, event_name: str):
    wid = require_workspace_id(workspace_id)
    doc = load_workspace_doc(workspace_id)
    before = len(doc["events"])
    doc["events"] = [e for e in doc["events"] if e["name"] != event_name]
    if len(doc["events"]) == before:
        raise HTTPException(status_code=404, detail=f"Event '{event_name}' not found")
    touch_meta(doc)
    storage.save_workspace(wid, doc)
    compile_wiki(wid, doc)
    safe_name = event_name.replace("/", "_")
    wiki_file = os.path.join(WIKI_DIR, wid, f"{safe_name}.md")
    if os.path.isfile(wiki_file):
        os.remove(wiki_file)
    return {"message": f"Event '{event_name}' deleted."}


@app.post("/workspaces/{workspace_id}/events/{event_name}/duplicate")
async def duplicate_workspace_event(workspace_id: str, event_name: str):
    import copy
    wid = require_workspace_id(workspace_id)
    doc = load_workspace_doc(workspace_id)
    source = next((e for e in doc["events"] if e["name"] == event_name), None)
    if not source:
        raise HTTPException(status_code=404, detail=f"Event '{event_name}' not found")
    new_event = copy.deepcopy(source)
    existing = {e["name"] for e in doc["events"]}
    base = f"{event_name}_copy"
    candidate = base
    i = 2
    while candidate in existing:
        candidate = f"{base}_{i}"
        i += 1
    new_event["name"] = candidate
    doc["events"].append(new_event)
    touch_meta(doc)
    storage.save_workspace(wid, doc)
    compile_wiki(wid, doc)
    return {"message": f"Duplicated as '{candidate}'.", "new_name": candidate}


class ParameterRename(BaseModel):
    new_key: str


@app.post("/workspaces/{workspace_id}/parameters/{key}/rename")
async def rename_parameter_key(workspace_id: str, key: str, body: ParameterRename):
    new_key = (body.new_key or "").strip()
    if not new_key:
        raise HTTPException(status_code=400, detail="new_key is required")
    wid = require_workspace_id(workspace_id)
    doc = load_workspace_doc(workspace_id)
    gp = doc.setdefault("global_parameters", {})
    if key not in gp:
        raise HTTPException(status_code=404, detail=f"Parameter '{key}' not found")
    if new_key != key and new_key in gp:
        raise HTTPException(status_code=400, detail=f"Parameter '{new_key}' already exists")
    gp[new_key] = gp.pop(key)
    for event in doc["events"]:
        for p in event.get("parameters", []):
            if p["key"] == key:
                p["key"] = new_key
    touch_meta(doc)
    storage.save_workspace(wid, doc)
    compile_wiki(wid, doc)
    return {"message": f"Renamed '{key}' → '{new_key}' across all events.", "new_key": new_key}


@app.delete("/workspaces/{workspace_id}/parameters/{key}")
async def delete_parameter(workspace_id: str, key: str):
    wid = require_workspace_id(workspace_id)
    doc = load_workspace_doc(workspace_id)
    doc.setdefault("global_parameters", {}).pop(key, None)
    for event in doc["events"]:
        event["parameters"] = [p for p in event.get("parameters", []) if p["key"] != key]
    touch_meta(doc)
    storage.save_workspace(wid, doc)
    compile_wiki(wid, doc)
    return {"message": f"Parameter '{key}' deleted from workspace and all events."}


@app.post("/workspaces/{workspace_id}/wiki/rebuild")
async def rebuild_wiki(workspace_id: str):
    wid = require_workspace_id(workspace_id)
    doc = load_workspace_doc(workspace_id)
    compile_wiki(wid, doc)
    return {"message": "Wiki rebuilt."}


@app.get("/workspaces/{workspace_id}/wiki/pages")
async def list_wiki_pages(workspace_id: str):
    root = ensure_wiki_on_disk(workspace_id)
    doc = load_workspace_doc(workspace_id)
    event_categories = {
        e["name"].replace("/", "_"): e.get("category", "")
        for e in doc.get("events", [])
    }
    files = [
        n
        for n in os.listdir(root)
        if n.endswith(".md") and os.path.isfile(os.path.join(root, n))
    ]
    files.sort(key=lambda n: (0 if n.startswith("_") else 1, n.lower()))
    return {
        "pages": [
            {
                "file": name,
                "label": wiki_page_label(name),
                "category": event_categories.get(name[:-3], "") if not name.startswith("_") else None,
            }
            for name in files
        ],
    }


@app.get("/workspaces/{workspace_id}/wiki/content/{filename}")
async def get_wiki_markdown(workspace_id: str, filename: str):
    wid = require_workspace_id(workspace_id)
    if (
        filename != os.path.basename(filename)
        or ".." in filename
        or not filename.endswith(".md")
    ):
        raise HTTPException(status_code=400, detail="Invalid wiki filename")
    path = os.path.join(WIKI_DIR, wid, filename)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Wiki page not found")
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    return {"filename": filename, "markdown": text}


@app.get("/workspaces/{workspace_id}/export")
async def export_workspace(workspace_id: str, fmt: str = Query("json")):
    doc = load_workspace_doc(workspace_id)
    wid = require_workspace_id(workspace_id)
    workspace_name = (doc.get("meta", {}).get("name") or wid[:8]).replace(" ", "_")
    events = sorted(doc.get("events", []), key=lambda e: (e.get("name") or "").lower())

    if fmt == "json":
        content = json.dumps(doc, indent=2).encode("utf-8")
        return StreamingResponse(
            io.BytesIO(content),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="{workspace_name}.json"'},
        )

    if fmt == "csv":
        catalog = build_parameters_catalog(doc)
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(["Key", "Type", "Scope", "Send To", "Description", "Used By Events", "Required On"])
        for row in catalog:
            used_by = row.get("used_by") or []
            events_list = ", ".join(u["event"] for u in used_by)
            required_on = ", ".join(u["event"] for u in used_by if u.get("required"))
            writer.writerow([
                row["key"],
                row.get("type", "string"),
                row.get("scope", "event"),
                row.get("send_to", "event_param"),
                row.get("description", ""),
                events_list,
                required_on,
            ])
        csv_bytes = buf.getvalue().encode("utf-8-sig")  # utf-8-sig for Excel compatibility
        return StreamingResponse(
            io.BytesIO(csv_bytes),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{workspace_name}_data_dictionary.csv"'},
        )

    if fmt not in ("markdown", "mkdocs", "docusaurus"):
        raise HTTPException(status_code=400, detail=f"Unknown export format: {fmt}")

    root = ensure_wiki_on_disk(workspace_id)
    md_files = [f for f in os.listdir(root) if f.endswith(".md")]

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        if fmt == "markdown":
            for fname in md_files:
                zf.write(os.path.join(root, fname), fname)

        elif fmt == "mkdocs":
            for fname in md_files:
                zf.write(os.path.join(root, fname), f"docs/{fname}")

            nav_events = "".join(
                f"    - {e['name']}: {e['name'].replace('/', '_')}.md\n" for e in events
            )
            mkdocs_yml = (
                f"site_name: {doc['meta'].get('name', 'Analytics Workspace')}\n"
                f"docs_dir: docs\n"
                f"theme:\n  name: material\n\n"
                f"nav:\n"
                f"  - Master Dictionary: _master_dictionary.md\n"
                f"  - Events:\n{nav_events}"
            )
            zf.writestr("mkdocs.yml", mkdocs_yml)

        elif fmt == "docusaurus":
            dict_path = os.path.join(root, "_master_dictionary.md")
            if os.path.isfile(dict_path):
                with open(dict_path, "r", encoding="utf-8") as f:
                    body = f.read()
                zf.writestr(
                    "docs/master-dictionary.md",
                    "---\nid: master-dictionary\ntitle: Master Parameter Dictionary\nsidebar_position: 1\n---\n\n" + body,
                )

            for pos, evt in enumerate(events, start=2):
                safe = evt["name"].replace("/", "_")
                evt_path = os.path.join(root, f"{safe}.md")
                if os.path.isfile(evt_path):
                    with open(evt_path, "r", encoding="utf-8") as f:
                        body = f.read()
                    zf.writestr(
                        f"docs/{safe}.md",
                        f"---\nid: {safe}\ntitle: {evt['name']}\nsidebar_position: {pos}\n---\n\n" + body,
                    )

            event_ids = ", ".join(f'"{e["name"].replace("/", "_")}"' for e in events)
            sidebars_js = (
                "/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */\n"
                "const sidebars = {\n"
                "  docs: [\n"
                "    'master-dictionary',\n"
                "    {\n"
                "      type: 'category',\n"
                "      label: 'Events',\n"
                f"      items: [{event_ids}],\n"
                "    },\n"
                "  ],\n"
                "};\n\n"
                "module.exports = sidebars;\n"
            )
            zf.writestr("sidebars.js", sidebars_js)

    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{workspace_name}-{fmt}.zip"'},
    )


@app.get("/templates")
async def get_templates():
    if not os.path.exists("ga4_standards.json"):
        return {}
    with open("ga4_standards.json", "r", encoding="utf-8") as f:
        return json.load(f)
