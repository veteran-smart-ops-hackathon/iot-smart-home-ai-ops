"""
RabbitMQ AMQP Consumer — Layer 1: IoT Ingestion & Message Queue
================================================================

Module này tài liệu hóa thiết kế AMQP routing topology cho hệ thống Aegis-IoT.
Theo kiến trúc AGENTS.md, RabbitMQ đóng vai trò High-throughput Message Bus
định tuyến raw telemetry streams từ IoT Edge Devices đến pre_progressor/ (Layer 2).

AMQP Exchange Topology:
-----------------------

  IoT Sensors / Edge Devices (MQTT → AMQP bridge)
        │
        ▼
  Exchange: "iot.telemetry"  (type=topic, durable=True)
        │
        ├── Routing Key: "device.#"   ──→  Queue: "pre_processor.raw_stream"
        │                                         ↓
        │                               pre_progressor/ (Kalman Smoothing)
        │                                         ↓
        │                               100% Write → TimescaleDB (Ground Truth)
        │
        └── Routing Key: "anomaly.#"  ──→  Queue: "ml.anomaly_trigger"
                                                    ↓
                                          machine_learning/ (Isolation Forest / Autoencoder)
                                                    ↓
                                          Anomaly-only Write → Qdrant + LangGraph Trigger

Dead-Letter Exchange:
    Exchange: "iot.dlx"  (type=direct)
    Queue:    "iot.dead_letters"  → Manual review / alert

Status: Phase 2 — Full AMQP implementation pending.
        Phase 1 uses MQTTGateway internal threading as interim solution.
"""

from __future__ import annotations

import logging
from typing import Any, Callable, Dict, Optional

logger = logging.getLogger("RabbitMQConsumer")

# ---------------------------------------------------------------------------
# Exchange & Queue Constants
# ---------------------------------------------------------------------------

EXCHANGE_NAME        = "iot.telemetry"
EXCHANGE_TYPE        = "topic"

QUEUE_RAW_STREAM      = "pre_processor.raw_stream"
QUEUE_ANOMALY_TRIGGER = "ml.anomaly_trigger"
QUEUE_DEAD_LETTERS    = "iot.dead_letters"

ROUTING_KEY_DEVICE  = "device.#"    # All device telemetry → pre_processor
ROUTING_KEY_ANOMALY = "anomaly.#"   # Anomaly-flagged events → ML engine

DLX_EXCHANGE    = "iot.dlx"
MESSAGE_TTL_MS  = 30_000   # Drop stale telemetry frames after 30s
PREFETCH_COUNT  = 1        # Fair dispatch: 1 unack'd msg per consumer


class RabbitMQConsumer:
    """
    AMQP Consumer for Layer 1 IoT Ingestion Pipeline.

    Intended responsibilities (Phase 2):
      1. Connect to RabbitMQ broker via pika (AMQP 0-9-1).
      2. Declare Exchange "iot.telemetry" (topic, durable).
      3. Bind queues with routing keys for pre_processor and ML paths.
      4. Consume raw telemetry frames and route to appropriate Layer 2 handler.
      5. Publish anomaly-flagged payloads to "ml.anomaly_trigger" queue.
      6. ACK/NACK messages with Dead-Letter Exchange fallback.

    Phase 1 interim: MQTTGateway in pre_progressor/ handles ingestion directly
    via internal threading until this AMQP layer is wired.
    """

    def __init__(self, amqp_url: str, prefetch_count: int = PREFETCH_COUNT):
        self.amqp_url = amqp_url
        self.prefetch_count = prefetch_count
        self._connection: Optional[Any] = None
        self._channel: Optional[Any] = None
        self._running = False

    def connect(self) -> None:
        """
        Establish blocking AMQP connection to RabbitMQ broker.

        Phase 2 implementation:
            import pika
            params = pika.URLParameters(self.amqp_url)
            params.heartbeat = 60
            self._connection = pika.BlockingConnection(params)
            self._channel = self._connection.channel()
            self._channel.basic_qos(prefetch_count=self.prefetch_count)
            self._declare_topology()
        """
        raise NotImplementedError(
            "Phase 2: RabbitMQ AMQP connection not yet implemented. "
            "Layer 1 ingestion currently handled by MQTTGateway threading."
        )

    def close(self) -> None:
        """Gracefully close AMQP channel and connection. (Phase 2)"""
        raise NotImplementedError("Phase 2")

    def _declare_topology(self) -> None:
        """
        Declare Exchange, Queues, Bindings, and Dead-Letter Exchange.

        Phase 2 implementation:
            ch = self._channel
            ch.exchange_declare(exchange=EXCHANGE_NAME, exchange_type=EXCHANGE_TYPE, durable=True)
            ch.exchange_declare(exchange=DLX_EXCHANGE, exchange_type="direct", durable=True)
            ch.queue_declare(queue=QUEUE_DEAD_LETTERS, durable=True)
            ch.queue_bind(QUEUE_DEAD_LETTERS, DLX_EXCHANGE, routing_key="dead")

            ch.queue_declare(
                queue=QUEUE_RAW_STREAM, durable=True,
                arguments={"x-message-ttl": MESSAGE_TTL_MS, "x-dead-letter-exchange": DLX_EXCHANGE}
            )
            ch.queue_bind(QUEUE_RAW_STREAM, EXCHANGE_NAME, routing_key=ROUTING_KEY_DEVICE)

            ch.queue_declare(
                queue=QUEUE_ANOMALY_TRIGGER, durable=True,
                arguments={"x-message-ttl": MESSAGE_TTL_MS, "x-dead-letter-exchange": DLX_EXCHANGE}
            )
            ch.queue_bind(QUEUE_ANOMALY_TRIGGER, EXCHANGE_NAME, routing_key=ROUTING_KEY_ANOMALY)
        """
        raise NotImplementedError("Phase 2")

    def consume_telemetry(
        self,
        on_raw_message: Callable[[Dict[str, Any]], None],
        on_anomaly_trigger: Callable[[Dict[str, Any]], None],
    ) -> None:
        """
        Start consuming from both queues with registered callbacks.

        Args:
            on_raw_message:     → pre_progressor.MQTTGateway._update_single_device()
            on_anomaly_trigger: → machine_learning inference → Qdrant upsert + LangGraph trigger

        Phase 2 implementation:
            self._channel.basic_consume(queue=QUEUE_RAW_STREAM,
                on_message_callback=self._wrap_callback(on_raw_message), auto_ack=False)
            self._channel.basic_consume(queue=QUEUE_ANOMALY_TRIGGER,
                on_message_callback=self._wrap_callback(on_anomaly_trigger), auto_ack=False)
            self._running = True
            self._channel.start_consuming()
        """
        raise NotImplementedError("Phase 2")

    def route_to_preprocessor(self, payload: Dict[str, Any]) -> None:
        """
        Publish a raw telemetry payload to pre_processor.raw_stream.

        Phase 2 implementation:
            import pika, json
            self._channel.basic_publish(
                exchange=EXCHANGE_NAME,
                routing_key=f"device.{payload.get('device_id', 'unknown')}",
                body=json.dumps(payload).encode(),
                properties=pika.BasicProperties(delivery_mode=2, content_type="application/json")
            )
        """
        raise NotImplementedError("Phase 2")

    def is_healthy(self) -> bool:
        """Returns True if AMQP connection is open. Phase 1: always False."""
        return False

    def get_topology_summary(self) -> Dict[str, Any]:
        """Returns documented AMQP topology for API/health endpoint inspection."""
        return {
            "status": "STUB_PHASE_1",
            "broker": "RabbitMQ 3.x (AMQP 0-9-1)",
            "exchange": {"name": EXCHANGE_NAME, "type": EXCHANGE_TYPE, "durable": True},
            "queues": [
                {
                    "name": QUEUE_RAW_STREAM,
                    "routing_key": ROUTING_KEY_DEVICE,
                    "consumer": "pre_progressor.MQTTGateway",
                    "ttl_ms": MESSAGE_TTL_MS,
                },
                {
                    "name": QUEUE_ANOMALY_TRIGGER,
                    "routing_key": ROUTING_KEY_ANOMALY,
                    "consumer": "machine_learning.AnomalyInferenceEngine",
                    "ttl_ms": MESSAGE_TTL_MS,
                },
            ],
            "dead_letter_exchange": DLX_EXCHANGE,
            "phase_2_note": (
                "Full pika AMQP implementation pending. "
                "Phase 1 uses MQTTGateway internal threading as interim solution."
            ),
        }
