"""
Machine Learning & Signal Processing Module — Aegis-IoT Smart Home.

Provides algorithm implementations for real-time IoT anomaly detection,
sensor signal smoothing, and vector similarity scoring.

Modules:
    kalman_filter          — 1D Kalman Filter (sensor noise reduction)
    anomaly_scorer         — Isolation Forest (unsupervised anomaly scoring)
    zscore_detector        — Rolling Z-Score (statistical outlier detection)
    cosine_similarity      — Dense vector cosine similarity (RAG embedding scoring)
    autoencoder_detector   — Statistical Autoencoder (reconstruction-error anomaly)

Usage:
    from machine_learning import KalmanFilter1D, IsolationForestScorer
    from machine_learning import ZScoreDetector, calculate_cosine_similarity
    from machine_learning import StatisticalAutoencoderDetector

References:
    - Kalman (1960): Linear Filtering & Prediction Problems, ASME J. Basic Eng.
    - Liu et al. (2008): Isolation Forest, IEEE ICDM.
    - Sakurada & Yairi (2014): Anomaly Detection with Autoencoders, MLSDA.
"""

from .anomaly_scorer import IsolationForestScorer
from .autoencoder_detector import StatisticalAutoencoderDetector
from .cosine_similarity import calculate_cosine_similarity
from .kalman_filter import KalmanFilter1D
from .zscore_detector import ZScoreDetector

__all__ = [
    "KalmanFilter1D",
    "IsolationForestScorer",
    "StatisticalAutoencoderDetector",
    "ZScoreDetector",
    "calculate_cosine_similarity",
]
