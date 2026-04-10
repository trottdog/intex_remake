"""Execute selected predictive notebooks headlessly and print a proof summary."""

from __future__ import annotations

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from ml.src.pipelines.notebook_execution import execute_notebook

NOTEBOOKS = (
    Path("ml/ml-pipelines/donor-upgrade/donor-upgrade-predictive.ipynb"),
    Path("ml/ml-pipelines/social-media-conversion/social-media-conversion-predictive.ipynb"),
)


def main() -> None:
    results = [execute_notebook(path, cwd=REPO_ROOT) for path in NOTEBOOKS]
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
