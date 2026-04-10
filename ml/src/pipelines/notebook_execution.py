"""Helpers for headless notebook execution checks."""

from __future__ import annotations

import asyncio
import warnings
from pathlib import Path
from typing import Any

import nbformat
from nbclient import NotebookClient
from nbformat.warnings import MissingIDFieldWarning


def _configure_windows_event_loop_policy() -> None:
    """Reduce Windows notebook-kernel instability during headless execution."""

    with warnings.catch_warnings():
        warnings.simplefilter("ignore", DeprecationWarning)
        selector_policy = getattr(asyncio, "WindowsSelectorEventLoopPolicy", None)
        if selector_policy is None or not hasattr(asyncio, "set_event_loop_policy"):
            return
        asyncio.set_event_loop_policy(selector_policy())


def execute_notebook(
    notebook_path: Path,
    *,
    cwd: Path,
    timeout: int = 300,
    kernel_name: str = "python3",
) -> dict[str, Any]:
    """Execute a notebook in memory and return a compact proof payload."""

    _configure_windows_event_loop_policy()

    with warnings.catch_warnings():
        warnings.simplefilter("ignore", MissingIDFieldWarning)
        notebook = nbformat.read(notebook_path, as_version=4)

    client = NotebookClient(
        notebook,
        timeout=timeout,
        kernel_name=kernel_name,
        allow_errors=False,
    )
    client.execute(cwd=str(cwd.resolve()))

    code_cells = [cell for cell in notebook.cells if cell.get("cell_type") == "code"]
    executed_with_output = sum(
        1
        for cell in code_cells
        if cell.get("execution_count") is not None and len(cell.get("outputs", [])) > 0
    )

    return {
        "notebook_path": str(notebook_path),
        "code_cell_count": len(code_cells),
        "executed_with_output_count": executed_with_output,
    }


__all__ = ["execute_notebook"]
