"""
backend/routers/model_router.py
Interactive calculator for scientific formulas used in the Aegis-IoT ML pipeline.
"""
from typing import Any, Dict

from fastapi import APIRouter
from pydantic import BaseModel

from machine_learning import (
    KalmanFilter1D,
    IsolationForestScorer,
    StatisticalAutoencoderDetector,
    ZScoreDetector,
    calculate_cosine_similarity,
)

router = APIRouter(tags=["Scientific Models"])


class ModelCalcRequest(BaseModel):
    model_type: str  # "kalman", "isolation_forest", "cosine", "zscore", "autoencoder"
    params: Dict[str, Any]


@router.post("/api/calculate-model")
async def calculate_model(req: ModelCalcRequest):
    """
    Interactive calculator for scientific formulas used in the Aegis-IoT ML pipeline.
    Delegates computation to the machine_learning module for clean separation of concerns.

    Supported model_type values:
        - "kalman"            : 1D Kalman Filter (signal smoothing)
        - "isolation_forest"  : Isolation Forest anomaly score s(x, n)
        - "zscore"            : Rolling Z-Score outlier detection
        - "cosine"            : Dense vector cosine similarity
        - "autoencoder"       : Statistical reconstruction error (MSE)
    """
    mtype = req.model_type
    p = req.params

    if mtype == "kalman":
        z_k     = float(p.get("measurement", 78.5))
        x_prev  = float(p.get("prior_state", 25.0))
        p_prev  = float(p.get("prior_error_cov", 1.0))
        q_noise = float(p.get("process_noise", 0.05))
        r_noise = float(p.get("measurement_noise", 0.8))

        kf = KalmanFilter1D(
            process_noise=q_noise,
            measurement_noise=r_noise,
            estimated_error=p_prev,
            initial_value=x_prev,
        )
        p_pred = p_prev + q_noise
        k_gain = p_pred / (p_pred + r_noise)
        x_est  = kf.update(z_k)
        p_est  = kf.p

        return {
            "model": "Kalman Smoothing Filter (1-D Linear)",
            "kalman_gain": round(k_gain, 4),
            "predicted_state": round(x_prev, 3),
            "estimated_state": round(x_est, 3),
            "error_covariance": round(p_est, 4),
            "formula_latex": r"K_k = \frac{P_{k|k-1}}{P_{k|k-1} + R}, \quad \hat{x}_{k|k} = \hat{x}_{k|k-1} + K_k(z_k - \hat{x}_{k|k-1})",
            "noise_reduction_pct": round((1.0 - (p_est / (p_pred + r_noise))) * 100, 2),
        }

    elif mtype == "isolation_forest":
        n   = int(p.get("sample_size", 256))
        h_x = float(p.get("path_length", 3.2))

        res = IsolationForestScorer.calculate_score(h_x=h_x, n=n)

        status_map = {
            "CRITICAL": "SỰ CỐ NGUY CƠ CAO (CRITICAL ANOMALY)",
            "WARNING":  "CẢNH BÁO (SUSPICIOUS OUTLIER)",
            "NORMAL":   "BÌNH THƯỜNG (NORMAL)",
        }

        return {
            "model": "Isolation Forest (iForest Unsupervised)",
            "sample_size_n": n,
            "path_length_hx": round(h_x, 3),
            "average_c_n": res["c_n"],
            "anomaly_score": res["anomaly_score"],
            "classification": status_map.get(res["severity"], res["severity"]),
            "formula_latex": r"c(n) = 2\left(\ln(n - 1) + 0.5772\right) - \frac{2(n-1)}{n}, \quad s(x, n) = 2^{-\frac{E(h(x))}{c(n)}}",
        }

    elif mtype == "zscore":
        x_val    = float(p.get("value", 82.0))
        mean_val = float(p.get("mean", 26.5))
        std_val  = float(p.get("std", 4.2)) if float(p.get("std", 4.2)) > 0 else 1.0

        res = ZScoreDetector.calculate(x_val=x_val, mean_val=mean_val, std_val=std_val)

        return {
            "model": "Time-Series Rolling Z-Score",
            "value": x_val,
            "mean": mean_val,
            "std": std_val,
            "z_score": res["z_score"],
            "is_outlier": res["is_outlier"],
            "threshold_sigma": 3.0,
            "formula_latex": r"Z = \frac{x_t - \mu_w}{\sigma_w}",
        }

    elif mtype == "autoencoder":
        original      = [float(x) for x in p.get("original",      [1.2, 0.5, 0.3, 0.8, 1.1])]
        reconstructed = [float(x) for x in p.get("reconstructed", [1.18, 0.52, 0.29, 0.79, 1.08])]
        threshold     = float(p.get("threshold", 0.35))

        detector = StatisticalAutoencoderDetector(threshold=threshold)
        res = detector.calculate_reconstruction_error(original, reconstructed)

        return {
            "model": "Statistical Autoencoder (Reconstruction Error Detector)",
            **res,
        }

    else:  # default: cosine similarity
        v1 = [float(x) for x in p.get("vec1", [0.85, 0.45, 0.22, 0.15])]
        v2 = [float(x) for x in p.get("vec2", [0.82, 0.48, 0.19, 0.18])]

        res = calculate_cosine_similarity(v1, v2)

        return {
            "model": "Multilingual-E5-Large (Dense Cosine Similarity)",
            "dot_product": res["dot_product"],
            "cosine_similarity": res["similarity"],
            "similarity_percentage": res["similarity_percentage"],
            "formula_latex": r"S_c(u, v) = \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\|_2 \|\mathbf{v}\|_2}",
        }
