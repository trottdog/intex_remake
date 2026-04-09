from pathlib import Path

ML_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = ML_ROOT.parent

DATA_DIR = ML_ROOT / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
INTERIM_DATA_DIR = DATA_DIR / "interim"
PROCESSED_DATA_DIR = DATA_DIR / "processed"
EXTERNAL_DATA_DIR = DATA_DIR / "external"

BACKEND_RAW_DATA_DIR = REPO_ROOT / "backend" / "lighthouse_csv_v7"

MODELS_DIR = ML_ROOT / "models"
REPORTS_DIR = ML_ROOT / "reports"
REPORTS_TABLES_DIR = REPORTS_DIR / "tables"
REPORTS_FIGURES_DIR = REPORTS_DIR / "figures"


def raw_data_dir_candidates() -> tuple[Path, ...]:
    """Return the raw-data directories in preference order."""

    return RAW_DATA_DIR, BACKEND_RAW_DATA_DIR
