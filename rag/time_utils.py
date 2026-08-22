import re
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional

# Múi giờ Việt Nam (UTC+7 / GMT+7)
VN_TIMEZONE = timezone(timedelta(hours=7))

DAYS_OF_WEEK_VI = [
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
    "Chủ Nhật"
]


def get_vietnam_now() -> datetime:
    """Trả về thời gian hiện tại theo múi giờ Việt Nam (GMT+7)."""
    return datetime.now(VN_TIMEZONE)


def format_vietnam_datetime(dt: Optional[datetime] = None) -> Dict[str, Any]:
    """
    Format chi tiết thời gian hiện tại theo chuẩn tiếng Việt:
    - date_str: 21/08/2026
    - date_full_str: ngày 21 tháng 08 năm 2026
    - time_str: 13:45:20
    - time_short: 13:45
    - day_of_week: Thứ Sáu
    - period_of_day: Buổi trưa / Buổi chiều...
    - summary: Thứ Sáu, ngày 21 tháng 08 năm 2026 (13:45)
    """
    if dt is None:
        dt = get_vietnam_now()
    
    day_name = DAYS_OF_WEEK_VI[dt.weekday()]
    date_str = dt.strftime("%d/%m/%Y")
    date_full_str = f"ngày {dt.day:02d} tháng {dt.month:02d} năm {dt.year}"
    time_str = dt.strftime("%H:%M:%S")
    time_short = dt.strftime("%H:%M")

    # Xác định buổi trong ngày
    hour = dt.hour
    if 5 <= hour < 11:
        period = "buổi sáng"
    elif 11 <= hour < 14:
        period = "buổi trưa"
    elif 14 <= hour < 18:
        period = "buổi chiều"
    elif 18 <= hour < 22:
        period = "buổi tối"
    else:
        period = "ban đêm"

    return {
        "datetime": dt,
        "day_of_week": day_name,
        "day": dt.day,
        "month": dt.month,
        "year": dt.year,
        "hour": dt.hour,
        "minute": dt.minute,
        "second": dt.second,
        "date_str": date_str,
        "date_full_str": date_full_str,
        "time_str": time_str,
        "time_short": time_short,
        "period_of_day": period,
        "summary": f"{day_name}, {date_full_str}, lúc {time_short} (GMT+7)",
        "iso": dt.isoformat()
    }


def get_vietnam_datetime_context(dt: Optional[datetime] = None) -> str:
    """Tạo chuỗi ngữ cảnh thời gian hệ thống để nhúng vào prompt của LLM."""
    info = format_vietnam_datetime(dt)
    return (
        f"THỜI GIAN HỆ THỐNG HIỆN TẠI (Múi giờ Việt Nam GMT+7):\n"
        f"- Thời điểm: {info['summary']}\n"
        f"- Ngày: {info['date_str']} ({info['day_of_week']})\n"
        f"- Giờ hiện tại: {info['time_str']} ({info['period_of_day']})\n"
    )


# Các từ khóa và cụm từ nhận diện ý định hỏi ngày/giờ (bao gồm cả từ viết tắt và lỗi chính tả gõ nhanh)
DATETIME_KEYWORDS = [
    "mấy giờ", "giờ mấy", "ngày mấy", "ngày bao nhiêu", "hôm nay", "thời gian",
    "thứ mấy", "bây giờ là", "hiện tại là mấy giờ", "ngày hôm nay", "tháng mấy",
    "năm nay", "mấy giờ rồi", "giờ hiện tại", "ngày hiện tại", "what time",
    "what date", "today date", "current time", "what day is today",
    # Lỗi gõ nhanh và từ viết tắt thông dụng
    "giừo", "mấy giừo", "bây giừo", "mấy h", "bây h", "mấy h rồi", "hôm ni",
    "bao nhiu", "ngày bn", "thời jan", "ngày nè", "hom nay"
]


def is_datetime_query(query: str) -> bool:
    """
    Kiểm tra xem câu hỏi có phải đang hỏi về ngày, giờ, thứ, thời gian thực tế không.
    """
    if not query:
        return False
    
    q = query.strip().lower()
    
    # 1. Khớp từ khóa cụm
    for kw in DATETIME_KEYWORDS:
        if kw in q:
            return True
            
    # 2. Khớp regex các dạng câu hỏi thời gian thông dụng (bao gồm giừo, h, ngày tháng)
    patterns = [
        r'\b(?:mấy|bao nhiêu|bao nhiu|bn)\s+(?:giờ|giừo|h|tiếng)\b',
        r'\b(?:mấy|bao nhiêu|bao nhiu|bn)\s+phút\b',
        r'\bngày\s+(?:mấy|nào|bao nhiêu|bao nhiu|bn)\b',
        r'\bthứ\s+(?:mấy|nào)\b',
        r'\b(?:hôm nay|hôm ni|hom nay)\b',
        r'\b(?:bây giờ|bây giừo|bây h|bay gio)\b',
        r'\bhiện tại\s+(?:là\s+)?(?:mấy|thời gian|thời jan|giờ|giừo|h|ngày)\b',
        r'\btime\s+(?:is\s+it|now)\b',
        r'\bwhat\s+time\b',
        r'\btoday\b'
    ]
    for pattern in patterns:
        if re.search(pattern, q):
            return True

    return False

