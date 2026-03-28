import os

from storage.base import WorkspaceStorage
from storage.file import FileWorkspaceStorage
from storage.gcs import GcsWorkspaceStorage


def get_storage() -> WorkspaceStorage:
    backend = os.getenv("STORAGE_BACKEND", "file").lower().strip()
    if backend == "file":
        return FileWorkspaceStorage()
    if backend == "gcs":
        bucket = (os.getenv("GCS_BUCKET") or "").strip()
        if not bucket:
            raise ValueError("GCS_BUCKET is required when STORAGE_BACKEND=gcs")
        return GcsWorkspaceStorage(bucket)
    raise ValueError(f"Unknown STORAGE_BACKEND={backend!r}; use 'file' or 'gcs'")
