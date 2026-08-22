"""
1D Linear Kalman Filter for real-time IoT sensor noise reduction.

Extracted from pre_progressor/mqtt_gateway.py to support clean architecture.
Implements the predict-update cycle for scalar state estimation.

References:
    - Kalman, R.E. (1960). A New Approach to Linear Filtering and Prediction Problems.
      Transactions of the ASME — Journal of Basic Engineering, 82(D), 35–45.
"""


class KalmanFilter1D:
    """1D Linear Kalman Filter for sensor noise reduction and smoothing.

    Used primarily for temperature and power sensor signals from the 6 Track A
    Smart Home devices (AC_01, HEATER_01, SENSOR_01, etc.).

    Attributes:
        q: Process noise covariance (Q). Lower = smoother but slower response.
        r: Measurement noise covariance (R). Higher = more filtering applied.
        p: Estimation error covariance (P). Updated each cycle.
        x: Current state estimate.

    Example:
        >>> kf = KalmanFilter1D(initial_value=25.0)
        >>> kf.update(26.3)
        25.08
        >>> kf.update(27.1)
        25.24
    """

    def __init__(
        self,
        process_noise: float = 0.05,
        measurement_noise: float = 0.8,
        estimated_error: float = 1.0,
        initial_value: float = 25.0,
    ) -> None:
        """
        Args:
            process_noise: Q — process noise variance. Controls how fast the
                filter tracks real changes. Default 0.05.
            measurement_noise: R — measurement noise variance. Controls how
                much sensor readings are trusted. Default 0.8.
            estimated_error: P — initial estimation error covariance. Default 1.0.
            initial_value: Starting state estimate (e.g. 25.0°C). Default 25.0.
        """
        self.q: float = process_noise
        self.r: float = measurement_noise
        self.p: float = estimated_error
        self.x: float = initial_value

    def update(self, measurement: float) -> float:
        """Applies one Kalman predict-update step and returns the smoothed state.

        Predict step:
            P_pred = P + Q

        Update step:
            K = P_pred / (P_pred + R)          ← Kalman gain
            x = x + K * (z - x)                ← State estimate
            P = (1 - K) * P_pred               ← Error covariance

        Args:
            measurement: Raw sensor reading z_k.

        Returns:
            Smoothed state estimate x_k|k, rounded to 2 decimal places.
        """
        # Predict step
        p_pred = self.p + self.q

        # Update step
        k_gain = p_pred / (p_pred + self.r)
        self.x = self.x + k_gain * (measurement - self.x)
        self.p = (1.0 - k_gain) * p_pred

        return round(float(self.x), 2)

    def reset(self, initial_value: float) -> None:
        """Resets the filter state to a new initial value."""
        self.x = initial_value
        self.p = 1.0
