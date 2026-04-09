"""Explainability helpers."""

from __future__ import annotations

import numpy as np
import pandas as pd


def summarize_coefficients(
    model: object,
    feature_names: list[str],
    *,
    top_n: int = 20,
) -> pd.DataFrame:
    """Summarize linear model coefficients."""

    coefficients = getattr(model, "coef_", None)
    if coefficients is None:
        return pd.DataFrame(columns=["feature", "coefficient", "abs_coefficient"])

    coefficient_array = np.ravel(coefficients)
    frame = pd.DataFrame(
        {
            "feature": feature_names,
            "coefficient": coefficient_array,
        }
    )
    frame["abs_coefficient"] = frame["coefficient"].abs()
    return frame.sort_values("abs_coefficient", ascending=False).head(top_n).reset_index(
        drop=True
    )


def plot_feature_importance(
    model: object,
    feature_names: list[str],
    *,
    top_n: int = 20,
) -> pd.DataFrame:
    """Return a feature-importance summary for tree-based models."""

    importances = getattr(model, "feature_importances_", None)
    if importances is None:
        return pd.DataFrame(columns=["feature", "importance"])

    frame = pd.DataFrame(
        {
            "feature": feature_names,
            "importance": importances,
        }
    )
    return frame.sort_values("importance", ascending=False).head(top_n).reset_index(
        drop=True
    )
