"""Generate Phase 2 shared feature tables and catalogs."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

import pandas as pd

from ml.src.config.paths import PROCESSED_DATA_DIR, REPORTS_TABLES_DIR
from ml.src.data.loaders import describe_raw_source, load_raw_tables
from ml.src.features.common_features import build_feature_catalog, save_dataset
from ml.src.features.donor_features import build_campaign_features, build_supporter_features
from ml.src.features.resident_features import (
    build_resident_features,
    build_resident_monthly_features,
)
from ml.src.features.safehouse_features import (
    build_public_impact_features,
    build_safehouse_features,
    build_safehouse_monthly_features,
)
from ml.src.features.social_features import build_post_features


def main() -> None:
    PROCESSED_DATA_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_TABLES_DIR.mkdir(parents=True, exist_ok=True)

    tables = load_raw_tables()
    source_label = describe_raw_source(required_tables=tables.keys())
    datasets: dict[str, pd.DataFrame] = {
        "supporter_features": build_supporter_features(tables),
        "campaign_features": build_campaign_features(tables),
        "post_features": build_post_features(tables),
        "resident_features": build_resident_features(tables),
        "resident_monthly_features": build_resident_monthly_features(tables),
        "safehouse_features": build_safehouse_features(tables),
        "safehouse_monthly_features": build_safehouse_monthly_features(tables),
        "public_impact_features": build_public_impact_features(tables),
    }

    for dataset_name, df in datasets.items():
        save_dataset(df, PROCESSED_DATA_DIR / f"{dataset_name}.csv")

    dataset_summary = pd.DataFrame(
        [
            {
                "dataset": dataset_name,
                "row_count": len(df),
                "column_count": len(df.columns),
            }
            for dataset_name, df in datasets.items()
        ]
    ).sort_values("dataset")
    feature_catalog = build_feature_catalog(datasets)

    dataset_summary.to_csv(
        REPORTS_TABLES_DIR / "phase2_dataset_summary.csv",
        index=False,
    )
    feature_catalog.to_csv(
        REPORTS_TABLES_DIR / "phase2_feature_catalog.csv",
        index=False,
    )

    print(f"Loaded raw ML tables from {source_label}")
    print(f"Generated {len(datasets)} processed datasets in {PROCESSED_DATA_DIR}")
    print(f"Wrote Phase 2 report tables to {REPORTS_TABLES_DIR}")


if __name__ == "__main__":
    main()
