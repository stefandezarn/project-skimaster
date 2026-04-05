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


def compile_wiki(workspace_id: str, config: dict) -> None:
    wid = require_workspace_id(workspace_id)
    root = os.path.join(WIKI_DIR, wid)
    if not os.path.exists(root):
        os.makedirs(root, exist_ok=True)

    for event in config["events"]:
        md = f"# Event: {event['name']}\n\n{event.get('description', '')}\n\n"
        md += "| Key | Type | Req | Scope | Send To | Description |\n|:---|:---|:---|:---|:---|:---|\n"

        for p in event["parameters"]:
            global_def = config["global_parameters"].get(p["key"], {})
            desc = p.get("description") or global_def.get("description", "TBD")
            req = "✅" if p["required"] else "❌"
            scope = global_def.get("scope", "event")
            send_to = global_def.get("send_to", "event_param")
            scope_label = {"event": "event", "item": "items[ ]", "user": "user"}.get(scope, scope)
            md += f"| `{p['key']}` | {p['type']} | {req} | {scope_label} | {send_to} | {desc} |\n"

        safe_name = event["name"].replace("/", "_")
        with open(os.path.join(root, f"{safe_name}.md"), "w", encoding="utf-8") as f:
            f.write(md)

    dict_md = "# Master Parameter Dictionary\n\n"
    dict_md += "| Parameter | Type | Scope | Send To | Description |\n|:---|:---|:---|:---|:---|\n"
    for key, data in config["global_parameters"].items():
        scope = data.get("scope", "event")
        send_to = data.get("send_to", "event_param")
        scope_label = {"event": "event", "item": "items[ ]", "user": "user"}.get(scope, scope)
        dict_md += f"| `{key}` | {data.get('type', 'string')} | {scope_label} | {send_to} | {data.get('description', '')} |\n"

    with open(os.path.join(root, "_master_dictionary.md"), "w", encoding="utf-8") as f:
        f.write(dict_md)


def ensure_wiki_on_disk(workspace_id: str) -> str:
    """Ensure wiki_output/{id} exists with .md files; compile if missing or empty."""
    wid = require_workspace_id(workspace_id)
    doc = load_workspace_doc(workspace_id)
    root = os.path.join(WIKI_DIR, wid)
    need_compile = True
    if os.path.isdir(root):
        md_files = [
            n
            for n in os.listdir(root)
            if n.endswith(".md") and os.path.isfile(os.path.join(root, n))
        ]
        need_compile = len(md_files) == 0
    if need_compile:
        compile_wiki(wid, doc)
    return root


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


class EventSchema(BaseModel):
    name: str
    description: str = ""
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
            }

    touch_meta(doc)
    storage.save_workspace(wid, doc)
    compile_wiki(wid, doc)
    return {"message": f"Successfully updated {event.name} and rebuilt Wiki."}


@app.get("/workspaces/{workspace_id}/wiki/pages")
async def list_wiki_pages(workspace_id: str):
    root = ensure_wiki_on_disk(workspace_id)
    files = [
        n
        for n in os.listdir(root)
        if n.endswith(".md") and os.path.isfile(os.path.join(root, n))
    ]
    files.sort(key=lambda n: (0 if n.startswith("_") else 1, n.lower()))
    return {
        "pages": [{"file": name, "label": wiki_page_label(name)} for name in files],
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
