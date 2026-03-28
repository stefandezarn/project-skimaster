from typing import Any, Dict, List, Optional

from storage.base import WorkspaceStorage


class GcsWorkspaceStorage(WorkspaceStorage):
    """
    Cloud Run stub: replace with google-cloud-storage reads/writes on a bucket.
    Set STORAGE_BACKEND=gcs and GCS_BUCKET=your-bucket when ready to implement.
    """

    def __init__(self, bucket: str):
        self.bucket = bucket

    def _todo(self) -> None:
        raise NotImplementedError(
            "GCS storage is not wired yet. Use STORAGE_BACKEND=file locally, "
            "or implement load/save against GCS with google-cloud-storage."
        )

    def create_workspace(self, name: Optional[str] = None) -> Dict[str, Any]:
        self._todo()

    def get_workspace(self, workspace_id: str) -> Optional[Dict[str, Any]]:
        self._todo()

    def save_workspace(self, workspace_id: str, data: Dict[str, Any]) -> None:
        self._todo()

    def list_workspaces(self) -> List[Dict[str, Any]]:
        self._todo()
