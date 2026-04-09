import math

import pandas as pd
from sklearn.datasets import make_classification, make_regression
from sklearn.linear_model import LogisticRegression, Ridge

from ml.src.modeling.train import run_classification_baselines, run_regression_baselines
from ml.src.modeling.tune import tune_model_grid
from ml.src.modeling.validation import (
    build_calibration_table,
    cross_validate_models,
    summarize_calibration,
)


def test_run_classification_baselines_returns_all_expected_models() -> None:
    X, y = make_classification(
        n_samples=80,
        n_features=6,
        n_informative=4,
        random_state=42,
    )
    train_features = pd.DataFrame(X[:60])
    test_features = pd.DataFrame(X[60:])
    y_train = pd.Series(y[:60])
    y_test = pd.Series(y[60:])

    results = run_classification_baselines(
        train_features,
        y_train,
        test_features,
        y_test,
    )

    assert {result.model_name for result in results} == {
        "dummy_classifier",
        "logistic_regression",
        "random_forest_classifier",
    }
    assert all(math.isfinite(float(result.metrics["accuracy"])) for result in results)


def test_run_classification_baselines_support_multiclass_targets() -> None:
    X, y = make_classification(
        n_samples=90,
        n_features=6,
        n_informative=4,
        n_redundant=0,
        n_classes=3,
        n_clusters_per_class=1,
        random_state=42,
    )
    train_features = pd.DataFrame(X[:70])
    test_features = pd.DataFrame(X[70:])
    y_train = pd.Series(y[:70])
    y_test = pd.Series(y[70:])

    results = run_classification_baselines(
        train_features,
        y_train,
        test_features,
        y_test,
    )

    assert all(math.isfinite(float(result.metrics["accuracy"])) for result in results)
    assert all(math.isfinite(float(result.metrics["precision"])) for result in results)
    assert all(math.isfinite(float(result.metrics["recall"])) for result in results)
    assert all(math.isfinite(float(result.metrics["f1"])) for result in results)


def test_run_regression_baselines_returns_all_expected_models() -> None:
    X, y = make_regression(
        n_samples=80,
        n_features=5,
        n_informative=4,
        noise=0.2,
        random_state=42,
    )
    train_features = pd.DataFrame(X[:60])
    test_features = pd.DataFrame(X[60:])
    y_train = pd.Series(y[:60])
    y_test = pd.Series(y[60:])

    results = run_regression_baselines(
        train_features,
        y_train,
        test_features,
        y_test,
    )

    assert {result.model_name for result in results} == {
        "dummy_regressor",
        "ridge_regression",
        "random_forest_regressor",
    }
    assert all(math.isfinite(float(result.metrics["rmse"])) for result in results)


def test_cross_validation_and_calibration_helpers_work() -> None:
    X, y = make_classification(
        n_samples=90,
        n_features=5,
        n_informative=3,
        random_state=42,
    )
    features = pd.DataFrame(X)
    target = pd.Series(y)
    models = {
        "logistic_regression": LogisticRegression(
            max_iter=1000,
            solver="liblinear",
        )
    }

    cv_result = cross_validate_models(
        features,
        target,
        models,
        task_type="classification",
        n_splits=4,
        sort_by="average_precision",
    )

    assert cv_result.n_splits == 4
    assert "average_precision_mean" in cv_result.summary.columns
    assert "roc_auc_mean" in cv_result.summary.columns

    fit_result = run_classification_baselines(
        features.iloc[:70],
        target.iloc[:70],
        features.iloc[70:],
        target.iloc[70:],
        models=models,
    )[0]
    calibration_table = build_calibration_table(target.iloc[70:], fit_result.scores, n_bins=5)
    calibration_summary = summarize_calibration(target.iloc[70:], fit_result.scores, n_bins=5)

    assert not calibration_table.empty
    assert "observed_rate" in calibration_table.columns
    assert 0.0 <= calibration_summary["expected_calibration_error"] <= 1.0


def test_tune_model_grid_returns_best_estimator() -> None:
    X, y = make_regression(
        n_samples=60,
        n_features=4,
        n_informative=3,
        noise=0.1,
        random_state=42,
    )
    features = pd.DataFrame(X)
    target = pd.Series(y)

    tuning_result = tune_model_grid(
        Ridge(),
        param_grid={"alpha": [0.1, 1.0, 10.0]},
        features=features,
        target=target,
        task_type="regression",
        n_splits=3,
    )

    assert isinstance(tuning_result.best_params, dict)
    assert "alpha" in tuning_result.best_params
    assert math.isfinite(tuning_result.best_score)
    assert not tuning_result.cv_results.empty
