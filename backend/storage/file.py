import json
import os
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from storage.base import WorkspaceStorage

LEGACY_CONFIG = "master_config.json"


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_workspace_document(workspace_id: str, name: Optional[str] = None) -> Dict[str, Any]:
    now = _utc_now()
    return {
        "schema_version": 1,
        "meta": {
            "id": workspace_id,
            "name": (name or "Untitled workspace").strip(),
            "created_at": now,
            "updated_at": now,
        },
        "events": [],
        "global_parameters": {},
    }


def normalize_workspace_document(data: Dict[str, Any]) -> Dict[str, Any]:
    data.setdefault("schema_version", 1)
    data.setdefault("meta", {})
    data.setdefault("events", [])
    data.setdefault("global_parameters", {})
    return data


def touch_meta(doc: Dict[str, Any]) -> None:
    doc.setdefault("meta", {})
    doc["meta"]["updated_at"] = _utc_now()


class FileWorkspaceStorage(WorkspaceStorage):
    """One JSON file per workspace under WORKSPACE_DATA_DIR (default: data/workspaces)."""

    def __init__(self, base_dir: Optional[str] = None):
        raw = base_dir or os.getenv("WORKSPACE_DATA_DIR", "data/workspaces")
        self.base_dir = Path(raw)
        self.base_dir.mkdir(parents=True, exist_ok=True)
        self._migrate_legacy_master_config()

    def _path(self, workspace_id: str) -> Path:
        return self.base_dir / f"{workspace_id}.json"

    def _migrate_legacy_master_config(self) -> None:
        legacy = Path(LEGACY_CONFIG)
        if not legacy.is_file():
            return
        existing = list(self.base_dir.glob("*.json"))
        if existing:
            return
        try:
            with open(legacy, "r", encoding="utf-8") as f:
                raw = json.load(f)
        except (json.JSONDecodeError, OSError):
            return
        wid = str(uuid.uuid4())
        doc = new_workspace_document(wid, name="Migrated legacy workspace")
        doc["events"] = raw.get("events") or []
        doc["global_parameters"] = raw.get("global_parameters") or {}
        doc["meta"]["created_at"] = doc["meta"]["updated_at"] = _utc_now()
        self.save_workspace(wid, doc)
        try:
            shutil.move(str(legacy), str(legacy) + ".bak")
        except OSError:
            pass

    def create_workspace(self, name: Optional[str] = None) -> Dict[str, Any]:
        wid = str(uuid.uuid4())
        doc = new_workspace_document(wid, name=name)
        self.save_workspace(wid, doc)
        return doc

    def get_workspace(self, workspace_id: str) -> Optional[Dict[str, Any]]:
        path = self._path(workspace_id)
        if not path.is_file():
            return None
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except (json.JSONDecodeError, OSError):
            return None
        return normalize_workspace_document(data)

    def save_workspace(self, workspace_id: str, data: Dict[str, Any]) -> None:
        path = self._path(workspace_id)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    def delete_workspace(self, workspace_id: str) -> None:
        path = self._path(workspace_id)
        if path.is_file():
            path.unlink()

    def rename_workspace(self, workspace_id: str, name: str) -> Dict[str, Any]:
        doc = self.get_workspace(workspace_id)
        if doc is None:
            raise FileNotFoundError(workspace_id)
        doc.setdefault("meta", {})["name"] = name.strip() or "Untitled workspace"
        touch_meta(doc)
        self.save_workspace(workspace_id, doc)
        return doc

    def duplicate_workspace(self, workspace_id: str, name: Optional[str] = None) -> Dict[str, Any]:
        source = self.get_workspace(workspace_id)
        if source is None:
            raise FileNotFoundError(workspace_id)
        new_id = str(uuid.uuid4())
        now = _utc_now()
        new_doc = {
            **source,
            "meta": {
                **source.get("meta", {}),
                "id": new_id,
                "name": (name or f"{source['meta'].get('name', 'Workspace')} (copy)").strip(),
                "created_at": now,
                "updated_at": now,
            },
        }
        self.save_workspace(new_id, new_doc)
        return new_doc

    def list_workspaces(self) -> List[Dict[str, Any]]:
        rows: List[Dict[str, Any]] = []
        for path in sorted(self.base_dir.glob("*.json")):
            wid = path.stem
            try:
                uuid.UUID(wid)
            except ValueError:
                continue
            doc = self.get_workspace(wid)
            if not doc:
                continue
            meta = doc.get("meta") or {}
            rows.append(
                {
                    "id": wid,
                    "name": meta.get("name", "Untitled workspace"),
                    "created_at": meta.get("created_at"),
                    "updated_at": meta.get("updated_at"),
                }
            )
        rows.sort(key=lambda r: (r.get("created_at") or ""))
        return rows
