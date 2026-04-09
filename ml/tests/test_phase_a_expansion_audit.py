from ml.src.pipelines.expansion_audit import (
    build_completed_vs_next_matrix,
    build_current_pipeline_inventory,
    build_reuse_map,
    write_phase_a_outputs,
)


def test_phase_a_current_inventory_reflects_current_pipeline_states() -> None:
    inventory = build_current_pipeline_inventory().set_index("pipeline_name")

    assert inventory.loc["donor_retention", "stage"] == "implemented_predictive"
    assert inventory.loc["resident_risk", "stage"] == "implemented_predictive"
    assert inventory.loc["donation_uplift", "stage"] == "notebook_scaffold"
    assert inventory.loc["safehouse_outcomes", "stage"] == "notebook_scaffold"
    assert inventory.loc["social_media_conversion", "predictive_target"] == (
        "label_donation_referral_positive"
    )


def test_phase_a_completed_vs_next_matrix_maps_existing_and_adjacent_work() -> None:
    matrix = build_completed_vs_next_matrix().set_index("expansion_slug")

    assert matrix.loc["incident_risk_prediction", "status"] == "implemented"
    assert matrix.loc["incident_risk_prediction", "current_repo_assets"] == "resident_risk"
    assert matrix.loc["safehouse_performance_explanation", "status"] == "partial"
    assert matrix.loc["best_posting_time_prediction", "target_readiness"] == "existing_label"
    assert "social_media_conversion" in matrix.loc[
        "content_type_effectiveness_explanation",
        "current_repo_assets",
    ]


def test_phase_a_reuse_map_and_outputs_write_expected_files(tmp_path) -> None:
    reuse_map = build_reuse_map().set_index("expansion_slug")

    assert reuse_map.loc["best_posting_time_prediction", "reuse_score"] > 0
    assert "ml/src/features/social_features.py" in reuse_map.loc[
        "best_posting_time_prediction",
        "feature_builder_modules",
    ]

    outputs = write_phase_a_outputs(
        tables_dir=tmp_path / "tables",
        docs_dir=tmp_path / "docs",
    )

    assert outputs["matrix"].exists()
    assert outputs["reuse_map"].exists()
    assert outputs["report"].exists()
