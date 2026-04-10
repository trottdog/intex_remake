"""Generic training helpers."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier, DummyRegressor
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from ml.src.config.settings import DEFAULT_RANDOM_STATE
from ml.src.modeling.metrics import evaluate_classifier, evaluate_regressor


@dataclass
class EncodedFeatureSet:
    """Container for encoded feature outputs."""

    feature_names: list[str]
    train_features: pd.DataFrame
    test_features: pd.DataFrame | None
    preprocessor: ColumnTransformer


@dataclass
class BaselineRunResult:
    """Container for a fitted baseline model and its evaluation outputs."""

    model_name: str
    model: object
    metrics: dict[str, float]
    predictions: pd.Series
    scores: pd.Series | np.ndarray | None = None


def encode_features(
    train_df: pd.DataFrame,
    test_df: pd.DataFrame | None = None,
    *,
    drop_columns: list[str] | None = None,
    categorical_columns: list[str] | None = None,
    numeric_columns: list[str] | None = None,
) -> EncodedFeatureSet:
    """Impute and one-hot encode train and optional test dataframes."""

    drop_columns = drop_columns or []
    train_features = train_df.drop(columns=drop_columns, errors="ignore")
    test_features = (
        None
        if test_df is None
        else test_df.drop(columns=drop_columns, errors="ignore")
    )

    if categorical_columns is None or numeric_columns is None:
        inferred_categorical = [
            column
            for column in train_features.columns
            if (
                pd.api.types.is_object_dtype(train_features[column])
                or isinstance(train_features[column].dtype, pd.CategoricalDtype)
                or pd.api.types.is_bool_dtype(train_features[column])
                or pd.api.types.is_string_dtype(train_features[column])
            )
        ]
        inferred_numeric = [
            column for column in train_features.columns if column not in inferred_categorical
        ]
        categorical_columns = inferred_categorical if categorical_columns is None else categorical_columns
        numeric_columns = inferred_numeric if numeric_columns is None else numeric_columns

    if categorical_columns:
        categorical_casts = {column: "object" for column in categorical_columns}
        train_features = train_features.astype(categorical_casts)
        if test_features is not None:
            test_features = test_features.astype(categorical_casts)

    if numeric_columns:
        numeric_columns = [
            column
            for column in numeric_columns
            if column in train_features.columns and train_features[column].notna().any()
        ]
        for column in numeric_columns:
            train_features[column] = pd.to_numeric(train_features[column], errors="coerce")
        if test_features is not None:
            for column in numeric_columns:
                test_features[column] = pd.to_numeric(test_features[column], errors="coerce")

    preprocessor = ColumnTransformer(
        transformers=[
            (
                "categorical",
                Pipeline(
                    steps=[
                        ("imputer", SimpleImputer(strategy="most_frequent")),
                        (
                            "encoder",
                            OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                        ),
                    ]
                ),
                categorical_columns,
            ),
            (
                "numeric",
                Pipeline(
                    steps=[
                        ("imputer", SimpleImputer(strategy="median")),
                        ("scaler", StandardScaler()),
                    ]
                ),
                numeric_columns,
            ),
        ],
        remainder="drop",
    )

    transformed_train = preprocessor.fit_transform(train_features)
    transformed_test = None if test_features is None else preprocessor.transform(test_features)

    feature_names = preprocessor.get_feature_names_out().tolist()
    encoded_train = pd.DataFrame(
        transformed_train,
        columns=feature_names,
        index=train_df.index,
    )
    encoded_test = (
        None
        if transformed_test is None
        else pd.DataFrame(transformed_test, columns=feature_names, index=test_df.index)
    )

    return EncodedFeatureSet(
        feature_names=feature_names,
        train_features=encoded_train,
        test_features=encoded_test,
        preprocessor=preprocessor,
    )


def time_split_data(
    df: pd.DataFrame,
    *,
    date_col: str,
    test_size: float = 0.2,
    cutoff_date: str | pd.Timestamp | None = None,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Split a dataframe into train and test partitions by time."""

    ordered = df.copy()
    ordered[date_col] = pd.to_datetime(ordered[date_col], errors="coerce")
    ordered = ordered.loc[ordered[date_col].notna()].sort_values(date_col).reset_index(drop=True)

    if cutoff_date is None:
        split_index = max(1, int(len(ordered) * (1 - test_size)))
        cutoff_value = ordered.iloc[split_index - 1][date_col]
    else:
        cutoff_value = pd.Timestamp(cutoff_date)

    train_df = ordered.loc[ordered[date_col] <= cutoff_value].copy()
    test_df = ordered.loc[ordered[date_col] > cutoff_value].copy()

    if test_df.empty:
        train_df = ordered.iloc[:-1].copy()
        test_df = ordered.iloc[-1:].copy()

    return train_df, test_df


def make_baseline_models(
    *,
    task_type: str,
    random_state: int = DEFAULT_RANDOM_STATE,
) -> dict[str, object]:
    """Return a small set of reusable baseline estimators."""

    if task_type == "classification":
        return {
            "dummy_classifier": DummyClassifier(strategy="prior"),
            "logistic_regression": LogisticRegression(
                max_iter=2000,
                solver="lbfgs",
                class_weight="balanced",
                random_state=random_state,
            ),
            "random_forest_classifier": RandomForestClassifier(
                n_estimators=200,
                class_weight="balanced_subsample",
                random_state=random_state,
            ),
        }

    if task_type == "regression":
        return {
            "dummy_regressor": DummyRegressor(strategy="mean"),
            "ridge_regression": Ridge(),
            "random_forest_regressor": RandomForestRegressor(
                n_estimators=200,
                random_state=random_state,
            ),
        }

    raise ValueError("task_type must be 'classification' or 'regression'")


def run_classification_baselines(
    train_features: pd.DataFrame,
    y_train: pd.Series | list[int] | list[bool],
    test_features: pd.DataFrame,
    y_test: pd.Series | list[int] | list[bool],
    *,
    models: dict[str, object] | None = None,
) -> list[BaselineRunResult]:
    """Fit and evaluate the standard classification baselines."""

    fitted_runs: list[BaselineRunResult] = []
    selected_models = models or make_baseline_models(task_type="classification")
    y_train_series = pd.Series(y_train, index=train_features.index).astype(int)
    y_test_series = pd.Series(y_test, index=test_features.index).astype(int)

    for model_name, model in selected_models.items():
        estimator = model
        estimator.fit(train_features, y_train_series)

        predictions = pd.Series(
            estimator.predict(test_features),
            index=test_features.index,
            dtype="int64",
        )
        if hasattr(estimator, "predict_proba"):
            probabilities = estimator.predict_proba(test_features)
            if probabilities.ndim == 2 and probabilities.shape[1] == 2:
                scores = pd.Series(
                    probabilities[:, 1],
                    index=test_features.index,
                    dtype="float64",
                )
            else:
                scores = probabilities.astype(float)
        elif hasattr(estimator, "decision_function"):
            scores = pd.Series(
                estimator.decision_function(test_features),
                index=test_features.index,
                dtype="float64",
            )
        else:
            scores = predictions.astype(float)

        fitted_runs.append(
            BaselineRunResult(
                model_name=model_name,
                model=estimator,
                metrics=evaluate_classifier(y_test_series, predictions, scores),
                predictions=predictions,
                scores=scores,
            )
        )

    return fitted_runs


def run_regression_baselines(
    train_features: pd.DataFrame,
    y_train: pd.Series | list[float],
    test_features: pd.DataFrame,
    y_test: pd.Series | list[float],
    *,
    models: dict[str, object] | None = None,
) -> list[BaselineRunResult]:
    """Fit and evaluate the standard regression baselines."""

    fitted_runs: list[BaselineRunResult] = []
    selected_models = models or make_baseline_models(task_type="regression")
    y_train_series = pd.Series(y_train, index=train_features.index, dtype=float)
    y_test_series = pd.Series(y_test, index=test_features.index, dtype=float)

    for model_name, model in selected_models.items():
        estimator = model
        estimator.fit(train_features, y_train_series)
        predictions = pd.Series(
            estimator.predict(test_features),
            index=test_features.index,
            dtype="float64",
        )

        fitted_runs.append(
            BaselineRunResult(
                model_name=model_name,
                model=estimator,
                metrics=evaluate_regressor(y_test_series, predictions),
                predictions=predictions,
            )
        )

    return fitted_runs
