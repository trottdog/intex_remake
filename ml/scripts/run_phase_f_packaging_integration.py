"""CLI wrapper for the Phase F packaging and integration pass."""

from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from ml.src.pipelines.phase_f_packaging_integration import main


if __name__ == "__main__":
    main()
