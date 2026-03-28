from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional


class WorkspaceStorage(ABC):
    @abstractmethod
    def create_workspace(self, name: Optional[str] = None) -> Dict[str, Any]:
        """Create a workspace. Returns document including assigned id in meta."""

    @abstractmethod
    def get_workspace(self, workspace_id: str) -> Optional[Dict[str, Any]]:
        """Load full workspace document or None if missing."""

    @abstractmethod
    def save_workspace(self, workspace_id: str, data: Dict[str, Any]) -> None:
        """Persist full workspace document."""

    @abstractmethod
    def list_workspaces(self) -> List[Dict[str, Any]]:
        """Return summary rows: id, name, created_at, etc."""
