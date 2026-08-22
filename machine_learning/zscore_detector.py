"""
Rolling Z-Score Outlier Detector for IoT time-series telemetry.

The Z-Score measures how many standard deviations a data point x_t
deviates from the rolling window mean μ_w:

    Z = (x_t - μ_w) / σ_w

A |Z| >= 3.0 classifies the point as a statistical outlier (3-sigma rule).
"""

from typing import Any, Dict


class ZScoreDetector:
    """Standard Z-Score outlier detection for univariate sensor readings.

    Uses the 3-sigma rule: a sample is an outlier if |Z| >= threshold (default 3.0).

    Example:
        >>> result = ZScoreDetector.calculate(82.0, mean_val=26.5, std_val=4.2)
        >>> result["z_score"]
        13.214
        >>> result["is_outlier"]
        True
    """

    DEFAULT_THRESHOLD: float = 3.0  # 3-sigma rule

    @staticmethod
    def calculate(
        x_val: float,
        mean_val: float,
        std_val: float,
        threshold: float = 3.0,
    ) -> Dict[str, Any]:
        """Computes the Z-Score and classifies the sample as outlier or normal.

        Formula:
            Z = (x_t - μ_w) / σ_w

        Args:
            x_val:     Current sensor reading x_t.
            mean_val:  Rolling window mean μ_w.
            std_val:   Rolling window standard deviation σ_w (must be > 0).
            threshold: Sigma threshold for outlier classification. Default 3.0.

        Returns:
            Dict with keys: x, mean, std, z_score, is_outlier,
            threshold_sigma, formula_latex.
        """
        safe_std = std_val if std_val > 0 else 1.0
        z_score = (x_val - mean_val) / safe_std
        is_outlier = abs(z_score) >= threshold

        return {
            "x": x_val,
            "mean": mean_val,
            "std": std_val,
            "z_score": round(z_score, 4),
            "is_outlier": is_outlier,
            "threshold_sigma": threshold,
            "formula_latex": r"Z = \frac{x_t - \mu_w}{\sigma_w}",
        }
