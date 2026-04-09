import pandas as pd

from ml.src.modeling.train import encode_features, make_baseline_models, time_split_data


def test_encode_features_returns_train_and_test_frames() -> None:
    train_df = pd.DataFrame(
        {
            "category": ["a", "b", "a"],
            "value": [1.0, 2.0, 3.0],
            "drop_me": [1, 1, 1],
        }
    )
    test_df = pd.DataFrame(
        {
            "category": ["b"],
            "value": [4.0],
            "drop_me": [1],
        }
    )

    encoded = encode_features(train_df, test_df, drop_columns=["drop_me"])

    assert encoded.train_features.shape[0] == 3
    assert encoded.test_features is not None
    assert encoded.test_features.shape[0] == 1
    assert any("categorical__category" in name for name in encoded.feature_names)


def test_time_split_data_uses_date_ordering() -> None:
    df = pd.DataFrame(
        {
            "event_date": pd.to_datetime(
                ["2024-01-01", "2024-02-01", "2024-03-01", "2024-04-01"]
            ),
            "value": [1, 2, 3, 4],
        }
    )

    train_df, test_df = time_split_data(df, date_col="event_date", test_size=0.25)

    assert train_df["event_date"].max() < test_df["event_date"].min()
    assert len(test_df) >= 1


def test_make_baseline_models_returns_expected_estimators() -> None:
    classifiers = make_baseline_models(task_type="classification")
    regressors = make_baseline_models(task_type="regression")

    assert set(classifiers.keys()) == {
        "dummy_classifier",
        "logistic_regression",
        "random_forest_classifier",
    }
    assert set(regressors.keys()) == {
        "dummy_regressor",
        "ridge_regression",
        "random_forest_regressor",
    }
