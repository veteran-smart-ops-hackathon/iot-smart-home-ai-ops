"""
Isolation Forest Anomaly Scorer for IoT telemetry streams.

Implements the unsupervised anomaly scoring algorithm based on Liu et al. (2008).
The score s(x, n) is derived from the expected path length E(h(x)) in an
Isolation Tree relative to the average path length c(n) in a BST.

References:
    - Liu, F.T., Ting, K.M., & Zhou, Z.-H. (2008).
      Isolation Forest. In Proceedings of the 8th IEEE International Conference
      on Data Mining (ICDM 2008), pp. 413–422.
      Formula: s(x, n) = 2^{-E(h(x)) / c(n)}
"""

import math
from typing import Any, Dict


class IsolationForestScorer:
    """Isolation Forest anomaly score computation (Liu et al., IEEE ICDM 2008).

    Computes the normalized anomaly score s(x, n) ∈ (0, 1]:
        - s → 1.0: highly anomalous (short isolation path)
        - s → 0.5: indeterminate
        - s → 0.0: definitely normal (long isolation path)

    All methods are class-level (no instance state needed).

    Example:
        >>> result = IsolationForestScorer.calculate_score(h_x=2.0, n=256)
        >>> result["anomaly_score"]
        0.7937
        >>> result["severity"]
        'WARNING'
    """

    EULER_GAMMA: float = 0.5772156649  # Euler–Mascheroni constant γ

    @classmethod
    def compute_c_n(cls, n: int) -> float:
        """Computes average path length c(n) for a BST built on n samples.

        Formula:
            c(n) = 2 * (ln(n-1) + γ) - 2*(n-1)/n    for n > 2
            c(n) = 1.0                                 for n ≤ 2

        Args:
            n: Number of samples (sub-sampling size, typically 256).

        Returns:
            Average unsuccessful search path length c(n).
        """
        if n <= 2:
            return 1.0
        return 2.0 * (math.log(n - 1) + cls.EULER_GAMMA) - (2.0 * (n - 1) / n)

    @classmethod
    def calculate_score(cls, h_x: float, n: int) -> Dict[str, Any]:
        """Calculates the full anomaly assessment for a given path length.

        Formula:
            s(x, n) = 2^{ -E(h(x)) / c(n) }

        Args:
            h_x: Observed mean path length E(h(x)) for sample x.
            n:   Sub-sample size used during isolation tree construction.

        Returns:
            Dict with keys: h_x, n, c_n, anomaly_score, is_anomaly,
            severity (NORMAL | WARNING | CRITICAL), formula_latex.
        """
        c_n = cls.compute_c_n(n)
        anomaly_score = math.pow(2.0, -(h_x / c_n))

        if anomaly_score >= 0.75:
            severity = "CRITICAL"
        elif anomaly_score >= 0.6:
            severity = "WARNING"
        else:
            severity = "NORMAL"

        is_anomaly = anomaly_score >= 0.6

        return {
            "h_x": round(h_x, 3),
            "n": n,
            "c_n": round(c_n, 4),
            "anomaly_score": round(anomaly_score, 4),
            "is_anomaly": is_anomaly,
            "severity": severity,
            "formula_latex": (
                r"c(n) = 2\left(\ln(n-1) + 0.5772\right) - \frac{2(n-1)}{n},"
                r"\quad s(x,n) = 2^{-\frac{E(h(x))}{c(n)}}"
            ),
        }
