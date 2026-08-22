import os
from functools import lru_cache
from typing import List, Optional, Any
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from litellm import Router
try:
    from langchain_community.chat_models.litellm import ChatLiteLLM
except ImportError:
    try:
        from langchain_litellm import ChatLiteLLM
    except ImportError:
        try:
            from langchain_community.chat_models import ChatLiteLLM
        except Exception:
            ChatLiteLLM = None
from langchain_openai import ChatOpenAI, OpenAIEmbeddings


from qdrant_client import QdrantClient

class Settings(BaseSettings):
    """
    Centralized configuration with LiteLLM Multi-Key Router & FPT AI Factory.
    TẤT CẢ CÁC BIẾN DƯỚI ĐÂY ĐỀU ĐƯỢC TỰ ĐỘNG ĐỌC TRỰC TIẾP TỪ FILE .env.
    """
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # 🤖 1. Multi-Agent Engine: Gemini Free Keys Pool (LiteLLM Router)
    GEMINI_KEY_1: str = Field(default="")
    GEMINI_KEY_2: str = Field(default="")
    GEMINI_KEY_3: str = Field(default="")
    GEMINI_KEY_4: str = Field(default="")
    GEMINI_KEY_5: str = Field(default="")
    GEMINI_KEY_6: str = Field(default="")
    GEMINI_API_KEYS: str = Field(default="", description="Danh sách key phân tách bằng dấu phẩy")

    GEMINI_MODEL_NAME: str = Field(default="gemini/gemini-2.5-flash", description="LiteLLM Gemini Model Tag")  # B3: sync with get_agent_llm() / get_rag_llm()
    GEMINI_TEMPERATURE: float = Field(default=0.2)
    LITELLM_ROUTING_STRATEGY: str = Field(default="usage-based-routing", description="usage-based-routing, simple-shuffle, least-busy")
    LITELLM_NUM_RETRIES: int = Field(default=3, description="Tự động retry sang key khác khi gặp 429")
    LITELLM_COOLDOWN_TIME: int = Field(default=60, description="Khóa key bị 429 trong N giây")

    # 🎯 2. Instruct & Embeddings (FPT AI Factory)
    FPT_AI_API_KEY: str = Field(default="")
    FPT_AI_BASE_URL: str = Field(default="https://mkp-api.fptcloud.com/v1")
    FPT_INSTRUCT_MODEL_NAME: str = Field(default="Llama-3.3-70B-Instruct")
    FPT_EMBEDDING_MODEL_NAME: str = Field(default="multilingual-e5-large")

    # 🗄️ 3A. Operational TimescaleDB (PostgreSQL 16)
    TIMESCALE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres_secret@localhost:5432/iot_ground_truth"
    )

    # 🎯 3B. Qdrant Vector Store
    QDRANT_HOST: str = Field(default="localhost")
    QDRANT_PORT: int = Field(default=6333)
    QDRANT_API_KEY: Optional[str] = Field(default=None)
    QDRANT_COLLECTION_INCIDENT: str = Field(default="incident_telemetry")
    QDRANT_COLLECTION_SOP: str = Field(default="system_baselines_sop")
    QDRANT_COLLECTION_VERIFIED_PLANS: str = Field(default="verified_action_plans")

    # 🐰 4. RabbitMQ Broker
    RABBITMQ_URI: str = Field(default="amqp://guest:guest@localhost:5672/")

    # 📡 5. MQTT Broker (Track A Smart Home Official Gateway)
    MQTT_BROKER_HOST: str = Field(default="mqtt-hackathon.lexatek.vn", description="Host/IP của MQTT Broker BTC hoặc Localhost")
    MQTT_BROKER_PORT: int = Field(default=443, description="Cổng MQTT (1883, 8883 hoặc 443 WSS)")
    MQTT_USERNAME: str = Field(default="", description="Username MQTT chính thức (set via .env)")
    MQTT_PASSWORD: str = Field(default="", description="Password MQTT (set via .env — never hardcode)")
    MQTT_TOPIC_TELEMETRY: str = Field(default="hackathon/veteran/test/telemetry", description="Topic nhận dữ liệu 6 thiết bị")
    MQTT_TOPIC_TEST: str = Field(default="hackathon/veteran/test/telemetry", description="Topic test đường truyền BTC")
    MQTT_TOPIC_CONTROL: str = Field(default="hackathon/smarthome/control", description="Topic phát lệnh điều khiển")
    MQTT_USE_TLS: bool = Field(default=True, description="Bật TLS/SSL nếu dùng cổng 443/8883")
    MQTT_TRANSPORT: str = Field(default="websockets", description="Giao thức: websockets hoặc tcp")
    MQTT_WS_PATH: str = Field(default="/mqtt", description="Đường dẫn WebSocket Path")
    MQTT_CLIENT_ID_PREFIX: str = Field(default="veteran-smarthome-client")


    # 📧 6. Email Notification Dispatcher
    EMAIL_NOTIFICATION_ENABLED: bool = Field(default=True, description="Tự động gửi email cảnh báo khi có sự cố bất thường")
    SMTP_HOST: str = Field(default="smtp.gmail.com")
    SMTP_PORT: int = Field(default=587)
    SMTP_USER: str = Field(default="", description="Tài khoản email gửi cảnh báo")
    SMTP_PASSWORD: str = Field(default="", description="Mật khẩu ứng dụng SMTP")
    SMTP_FROM_EMAIL: str = Field(default="aegis-iot@smarthome.ai", description="Email người gửi hiển thị")
    ALERT_RECIPIENT_EMAIL: str = Field(default="user@smarthome.ai", description="Email người nhận thông báo cảnh báo (chuỗi đơn hoặc nhiều email phân tách bởi dấu phẩy)")
    ALERT_RECIPIENT_EMAILS: str = Field(default="", description="Danh sách email nhận cảnh báo phân tách bằng dấu phẩy")
    DASHBOARD_BASE_URL: str = Field(default="http://localhost:8000", description="URL Dashboard để mở trực tiếp từ email")


@lru_cache()
def get_settings() -> Settings:
    """Returns singleton settings instance loaded from .env."""
    return Settings()


def get_all_recipient_emails() -> List[str]:
    """Collects and normalizes all recipient emails from settings."""
    settings = get_settings()
    emails: List[str] = []
    
    source = f"{settings.ALERT_RECIPIENT_EMAIL},{settings.ALERT_RECIPIENT_EMAILS}"
    for raw in source.replace(";", ",").split(","):
        cleaned = raw.strip().lower()
        if cleaned and "@" in cleaned and "." in cleaned and cleaned not in emails:
            emails.append(cleaned)
            
    if not emails:
        emails = ["user@smarthome.ai"]
    return emails


def get_all_gemini_keys() -> List[str]:
    """Collects all non-empty Gemini API keys from settings."""
    settings = get_settings()
    keys: List[str] = []
    
    for k in [settings.GEMINI_KEY_1, settings.GEMINI_KEY_2, settings.GEMINI_KEY_3, settings.GEMINI_KEY_4, settings.GEMINI_KEY_5, settings.GEMINI_KEY_6]:
        if k and k.strip() and not k.startswith("your_"):
            keys.append(k.strip())
            
    if settings.GEMINI_API_KEYS:
        for k in settings.GEMINI_API_KEYS.split(","):
            cleaned = k.strip()
            if cleaned and cleaned not in keys and not cleaned.startswith("your_"):
                keys.append(cleaned)
                
    if not keys:
        keys = ["placeholder-gemini-key"]
    return keys


@lru_cache()
def get_agent_router() -> Router:
    """
    Khởi tạo LiteLLM Router với Pool các Gemini API Keys.
    """
    settings = get_settings()
    keys = get_all_gemini_keys()

    model_list = [
        {
            "model_name": "gemini-agent-pool",
            "litellm_params": {
                "model": settings.GEMINI_MODEL_NAME,
                "api_key": key,
                "temperature": settings.GEMINI_TEMPERATURE,
            },
        }
        for key in keys
    ]

    return Router(
        model_list=model_list,
        routing_strategy=settings.LITELLM_ROUTING_STRATEGY,
        num_retries=settings.LITELLM_NUM_RETRIES,
        cooldown_time=settings.LITELLM_COOLDOWN_TIME,
    )


def get_agent_llm() -> Any:
    """
    Khởi tạo ChatLLM cho LangGraph / Multi-Agent & RAG reasoning qua Gemini OpenAI endpoint.
    """
    settings = get_settings()
    keys = get_all_gemini_keys()
    key = keys[0] if keys and not keys[0].startswith("placeholder") else ""
    
    if key:
        return ChatOpenAI(
            model="gemini/gemini-2.5-flash",  # B3: corrected LiteLLM provider-prefixed model name
            api_key=key,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
            temperature=settings.GEMINI_TEMPERATURE,
            max_retries=3
        )
    return None


def get_rag_llm() -> ChatOpenAI:
    """
    Khởi tạo LLM cho RAG Deep Reasoning (FPT AI Factory hoặc Gemini Fallback).
    """
    settings = get_settings()
    if settings.FPT_AI_API_KEY and not settings.FPT_AI_API_KEY.startswith("your_"):
        return ChatOpenAI(
            model=settings.FPT_INSTRUCT_MODEL_NAME,
            api_key=settings.FPT_AI_API_KEY,
            base_url=settings.FPT_AI_BASE_URL,
            temperature=0.1,
            max_retries=3,
            timeout=60.0
        )
    
    keys = get_all_gemini_keys()
    key = keys[0] if keys and not keys[0].startswith("placeholder") else ""
    return ChatOpenAI(
        model="gemini/gemini-2.5-flash",  # B3: corrected LiteLLM provider-prefixed model name
        api_key=key,
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        temperature=0.1,
        max_retries=3
    )


def get_embeddings() -> OpenAIEmbeddings:
    """
    Khởi tạo FPT AI Factory Embeddings cho Qdrant Vector Storage.
    """
    settings = get_settings()
    return OpenAIEmbeddings(
        model=settings.FPT_EMBEDDING_MODEL_NAME,
        api_key=settings.FPT_AI_API_KEY,
        base_url=settings.FPT_AI_BASE_URL,
        check_embedding_ctx_length=False
    )


def get_qdrant_client() -> QdrantClient:
    """
    Khởi tạo Qdrant client connection.
    """
    settings = get_settings()
    return QdrantClient(
        host=settings.QDRANT_HOST,
        port=settings.QDRANT_PORT,
        api_key=settings.QDRANT_API_KEY if settings.QDRANT_API_KEY else None,
        check_compatibility=False
    )

