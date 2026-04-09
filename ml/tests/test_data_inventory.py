from ml.src.data.loaders import load_raw_tables, resolve_raw_data_dir
from ml.src.data.schemas import EXPECTED_TABLES
from ml.src.data.validation import (
    build_date_inventory,
    schema_summary,
    validate_expected_tables,
)


def test_load_raw_tables_finds_all_expected_phase_zero_tables() -> None:
    tables = load_raw_tables()

    assert sorted(tables.keys()) == sorted(EXPECTED_TABLES)
    assert validate_expected_tables(tables) == []


def test_schema_summary_contains_row_counts_and_grain() -> None:
    summary = schema_summary(load_raw_tables())

    safehouses = summary.loc[summary["table"] == "safehouses"].iloc[0]
    process_recordings = summary.loc[
        summary["table"] == "process_recordings"
    ].iloc[0]

    assert int(safehouses["row_count"]) == 9
    assert safehouses["grain"] == "one row per safehouse"
    assert int(process_recordings["row_count"]) == 2819


def test_date_inventory_captures_known_coverage() -> None:
    inventory = build_date_inventory(load_raw_tables())

    donations = inventory.loc[
        (inventory["table"] == "donations")
        & (inventory["date_column"] == "donation_date")
    ].iloc[0]

    assert donations["min_value"] == "2023-01-09"
    assert donations["max_value"] == "2026-03-01"


def test_resolve_raw_data_dir_prefers_directory_with_full_dataset() -> None:
    resolved = resolve_raw_data_dir()

    assert resolved.name in {"raw", "lighthouse_csv_v7"}
