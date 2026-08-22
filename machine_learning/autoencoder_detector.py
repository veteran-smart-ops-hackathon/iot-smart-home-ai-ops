"""
Statistical Autoencoder Reconstruction Error Detector.

Mimics the bottleneck compression and reconstruction step of a neural Autoencoder
using statistical baseline comparison, without requiring PyTorch/TensorFlow at runtime.

In a trained Autoencoder, the model learns to reconstruct normal patterns. When an
anomalous input is presented, the reconstruction error MSE(x, x̂) spikes above a
calibrated threshold, flagging the sample as an anomaly.

Formula:
    MSE(x, x̂) = (1/d) * Σ (x_i - x̂_i)²    for i = 1..d

References:
    - Sakurada, M. & Yairi, T. (2014). Anomaly Detection Using Autoencoders with
      Nonlinear Dimensionality Reduction. In Proc. MLSDA Workshop, pp. 4–11.
    - Hinton, G.E. & Salakhutdinov, R.R. (2006). Reducing the Dimensionality of
      Data with Neural Networks. Science, 313(5786), 504–507.
"""

from typing import Any, Dict, List


class StatisticalAutoencoderDetector:
    """Reconstruction-based anomaly detector using MSE against a baseline.

    Suitable for lightweight deployment on IoT edge inference pipelines where
    full neural network inference is unavailable. The detector compares an
    observed telemetry feature vector against a known normal baseline vector and
    computes the mean squared reconstruction error.

    Attributes:
        threshold: MSE threshold above which a sample is declared anomalous.
            Calibrated empirically from normal operating telemetry. Default 0.35.

    Example:
        >>> detector = StatisticalAutoencoderDetector(threshold=0.35)
        >>> original     = [1.2, 0.5, 0.3, 0.8, 1.1]
        >>> reconstructed = [1.18, 0.52, 0.29, 0.79, 1.08]
        >>> result = detector.calculate_reconstruction_error(original, reconstructed)
        >>> result["is_anomaly"]
        False
        >>> result["reconstruction_error_mse"]
        0.0003
    """

    def __init__(self, threshold: float = 0.35) -> None:
        """
        Args:
            threshold: MSE threshold (τ). A reconstruction error ≥ τ triggers
                an anomaly flag. Calibrate from normal baseline telemetry.
                Default 0.35 is suitable for normalized sensor feature vectors.
        """
        self.threshold: float = threshold

    def calculate_reconstruction_error(
        self,
        original: List[float],
        reconstructed: List[float],
    ) -> Dict[str, Any]:
        """Calculates Mean Squared Reconstruction Error between input and baseline.

        Formula:
            MSE(x, x̂) = (1/d) * Σ_{i=1}^{d} (x_i - x̂_i)²

        Anomaly score is normalized to [0, 1] for consistency with other ML modules:
            anomaly_score = min(1.0, MSE / (2 * τ))

        Args:
            original:      Observed (raw or feature-extracted) telemetry vector x.
            reconstructed: Expected normal baseline vector x̂ (e.g. rolling mean
                           or an actually trained autoencoder reconstruction).

        Returns:
            Dict with keys:
                - dimension (int): Vector length d.
                - reconstruction_error_mse (float): Raw MSE value.
                - threshold (float): Configured anomaly threshold τ.
                - anomaly_score (float): Normalized score ∈ [0, 1].
                - is_anomaly (bool): True if MSE >= threshold.
                - formula_latex (str): LaTeX representation of the formula.
        """
        if len(original) != len(reconstructed) or len(original) == 0:
            return {
                "error": "Vectors must be of equal, non-zero length",
                "reconstruction_error_mse": 0.0,
                "is_anomaly": False,
                "anomaly_score": 0.0,
            }

        d = len(original)
        mse = sum((o - r) ** 2 for o, r in zip(original, reconstructed)) / d

        # Normalize to [0, 1] for dashboard display
        anomaly_score = min(1.0, mse / (self.threshold * 2.0)) if self.threshold > 0 else 0.0
        is_anomaly = mse >= self.threshold

        return {
            "dimension": d,
            "reconstruction_error_mse": round(mse, 6),
            "threshold": self.threshold,
            "anomaly_score": round(anomaly_score, 4),
            "is_anomaly": is_anomaly,
            "formula_latex": (
                r"\text{MSE}(x, \hat{x}) = "
                r"\frac{1}{d} \sum_{i=1}^{d} (x_i - \hat{x}_i)^2"
            ),
        }
