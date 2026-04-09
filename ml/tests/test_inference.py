from ml.src.inference.predict import load_model_bundle, predict_dataframe
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
