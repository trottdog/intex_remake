"""Generate Phase 1 exploratory data analysis outputs."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from ml.src.config.paths import REPORTS_FIGURES_DIR, REPORTS_TABLES_DIR
from ml.src.data.loaders import describe_raw_source, load_raw_tables
from ml.src.data.profiling import (
    KEY_PHASE1_TABLES,
    PRIMARY_DATE_COLUMNS,
    build_categorical_report,
    build_label_feasibility_report,
    build_missingness_report,
    build_table_profile_report,
    build_time_coverage_reports,
    plot_missingness,
    plot_time_coverage,
)


def main() -> None:
    REPORTS_TABLES_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_FIGURES_DIR.mkdir(parents=True, exist_ok=True)

    tables = load_raw_tables()
    source_label = describe_raw_source(required_tables=tables.keys())

    build_table_profile_report(tables).to_csv(
        REPORTS_TABLES_DIR / "phase1_table_profile_report.csv",
        index=False,
    )
    build_missingness_report(tables, table_names=KEY_PHASE1_TABLES).to_csv(
        REPORTS_TABLES_DIR / "phase1_missingness_report.csv",
        index=False,
    )
    build_categorical_report(tables, table_names=KEY_PHASE1_TABLES).to_csv(
        REPORTS_TABLES_DIR / "phase1_categorical_report.csv",
        index=False,
    )

    time_summary, time_monthly = build_time_coverage_reports(
        tables,
        table_names=KEY_PHASE1_TABLES,
    )
    time_summary.to_csv(
        REPORTS_TABLES_DIR / "phase1_time_coverage_summary.csv",
        index=False,
    )
    time_monthly.to_csv(
        REPORTS_TABLES_DIR / "phase1_time_coverage_monthly.csv",
        index=False,
    )
    build_label_feasibility_report(tables).to_csv(
        REPORTS_TABLES_DIR / "phase1_label_feasibility_report.csv",
        index=False,
    )

    figures_dir = REPORTS_FIGURES_DIR / "phase1"
    for table_name in KEY_PHASE1_TABLES:
        plot_missingness(
            tables[table_name],
            table_name,
            figures_dir / f"{table_name}_missingness.png",
        )

        date_column = PRIMARY_DATE_COLUMNS.get(table_name)
        if date_column and date_column in tables[table_name].columns:
            plot_time_coverage(
                tables[table_name],
                date_column,
                table_name,
                figures_dir / f"{table_name}_{date_column}_coverage.png",
            )

    print(f"Loaded {len(tables)} tables from {source_label}")
    print(f"Wrote Phase 1 table outputs to {REPORTS_TABLES_DIR}")
    print(f"Wrote Phase 1 figures to {figures_dir}")


if __name__ == "__main__":
    main()
