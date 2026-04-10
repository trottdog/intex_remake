import pandas as pd
from sklearn.linear_model import LogisticRegression

from ml.src.inference.predict import load_model_bundle, predict_dataframe
from ml.src.modeling.train import encode_features
from ml.src.pipelines.donor_retention.build_dataset import build_dataset
from ml.src.pipelines.registry import run_predictive_pipeline


def test_predict_dataframe_returns_prediction_columns() -> None:
    run_predictive_pipeline("donor_retention")

    dataset = build_dataset(save_output=False).head(5)
    model_bundle = load_model_bundle("donor_retention")
    scored = predict_dataframe(dataset, model_bundle=model_bundle)

    assert "prediction" in scored.columns
    assert "prediction_score" in scored.columns
    assert scored["prediction"].isin([0, 1]).all()
    assert scored["prediction_score"].between(0, 1).all()


def test_predict_dataframe_coerces_datetime_strings_for_numeric_imputer() -> None:
    train_df = pd.DataFrame(
        {
            "target": [0, 1, 0, 1, 1, 0],
            "snapshot_at": pd.to_datetime(
                [
                    "2026-01-01T00:00:00+00:00",
                    "2026-01-02T00:00:00+00:00",
                    "2026-01-03T00:00:00+00:00",
                    "2026-01-04T00:00:00+00:00",
                    "2026-01-05T00:00:00+00:00",
                    "2026-01-06T00:00:00+00:00",
                ]
            ),
            "event_ts": pd.to_datetime(
                [
                    "2026-01-01T12:00:00+00:00",
                    "2026-01-02T12:00:00+00:00",
                    "2026-01-03T12:00:00+00:00",
                    "2026-01-04T12:00:00+00:00",
                    "2026-01-05T12:00:00+00:00",
                    "2026-01-06T12:00:00+00:00",
                ]
            ),
            "amount": [10.0, 12.0, 11.0, 18.0, 17.0, 9.0],
        }
    )

    encoded = encode_features(
        train_df,
        drop_columns=["target", "snapshot_at"],
    )
    model = LogisticRegression(max_iter=500)
    model.fit(encoded.train_features, train_df["target"].astype(int))

    model_bundle = {
        "model": model,
        "preprocessor": encoded.preprocessor,
        "feature_names": encoded.feature_names,
        "target_col": "target",
        "split_col": "snapshot_at",
        "drop_cols": [],
        "task_type": "classification",
    }

    scoring_df = pd.DataFrame(
        {
            "snapshot_at": [
                "2026-01-07T00:00:00+00:00",
                "2026-01-08T00:00:00+00:00",
            ],
            "event_ts": [
                "2026-01-07T12:00:00+00:00",
                "2026-01-08T12:00:00+00:00",
            ],
            "amount": [13.0, 16.0],
        }
    )

    scored = predict_dataframe(scoring_df, model_bundle=model_bundle)
    assert len(scored) == 2
    assert scored["prediction"].isin([0, 1]).all()
    assert scored["prediction_score"].between(0, 1).all()
