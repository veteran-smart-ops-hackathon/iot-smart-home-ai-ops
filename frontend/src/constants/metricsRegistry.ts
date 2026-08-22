import { MetricDefinition, MetricCategory, CategoryInfo } from '@/types/metrics';

export const METRIC_CATEGORIES: Record<MetricCategory, CategoryInfo> = {
  thermal_power: {
    id: 'thermal_power',
    name: 'Nhiệt Độ & Năng Lượng Điện',
    description: 'Các thông số giám sát quá nhiệt, công suất tiêu thụ và an toàn điện lưới.',
    iconName: 'Flame',
    badgeClass: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
  environment_air: {
    id: 'environment_air',
    name: 'Môi Trường & Không Khí',
    description: 'Chất lượng không khí trong nhà, độ ẩm, điểm sương và bụi mịn PM2.5.',
    iconName: 'Wind',
    badgeClass: 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800',
  },
  ai_math: {
    id: 'ai_math',
    name: 'Mô Hình Toán & Trí Tuệ Nhân Tạo (ML)',
    description: 'Các điểm số phát hiện dị thường, lọc nhiễu Kalman và đối chiếu vector không gian.',
    iconName: 'Atom',
    badgeClass: 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  },
  iot_network: {
    id: 'iot_network',
    name: 'Mạng IoT & Giao Thức Truyền Tin',
    description: 'Thông lượng, độ trễ và trạng thái hàng đợi tin nhắn MQTT / RabbitMQ.',
    iconName: 'Activity',
    badgeClass: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  },
  rag_knowledge: {
    id: 'rag_knowledge',
    name: 'Cơ Sở Tri Thức RAG & Vector Qdrant',
    description: 'Tham số trích xuất tài liệu SOP, vector embedding 1024D và độ tương đồng.',
    iconName: 'BookOpen',
    badgeClass: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  },
  system_safety: {
    id: 'system_safety',
    name: 'An Toàn & Khép Vòng Phản Hồi (L5)',
    description: 'Điểm đánh giá rủi ro, cổng phê duyệt con người (HITL) và tự học Few-Shot.',
    iconName: 'ShieldCheck',
    badgeClass: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  },
};

export const METRICS_REGISTRY: Record<string, MetricDefinition> = {
  // ==========================================================================
  // 1. NHIỆT ĐỘ & NĂNG LƯỢNG ĐIỆN
  // ==========================================================================
  temp_c: {
    key: 'temp_c',
    name: 'Nhiệt Độ Bề Mặt & Không Khí',
    shortName: 'Nhiệt Độ',
    category: 'thermal_power',
    unit: 'Độ Celsius',
    unitSymbol: '°C',
    formulaText: 'T_c = T_sensor - sai_số_hiệu_chuẩn',
    formulaLatex: 'T_c = T_{\\text{raw}} - \\Delta T_{\\text{calib}}',
    description: 'Nhiệt độ môi trường phòng và bề mặt tiếp xúc của thiết bị sinh nhiệt (bếp từ, lò sưởi, máy nén điều hòa).',
    detailedExplanation: 'Được thu thập liên tục từ cảm biến nhiệt độ RTD/NTC hoặc nhiệt kế hồng ngoại gắn tại vùng gia nhiệt. Đây là chỉ số quan trọng số 1 để ngăn chặn nguy cơ cháy nổ, biến dạng vỏ nhựa cách điện và quá nhiệt linh kiện bán dẫn công suất (IGBT).',
    normalRange: {
      min: 18.0,
      max: 35.0,
      description: '18.0°C - 35.0°C (Phòng sinh hoạt) / < 70.0°C (Mặt kính bếp khi có người đun nấu)',
    },
    warningThreshold: {
      value: 60.0,
      description: '> 60.0°C đối với không gian kín hoặc nhiệt độ thiết bị tăng đột ngột > 5°C/phút.',
    },
    dangerThreshold: {
      value: 75.0,
      description: '> 75.0°C khi không có người trong phòng (PIR=False) -> Nguy cơ cháy khẩn cấp theo chuẩn SOP-SH-2026.',
    },
    whyItMatters: 'Quá nhiệt là nguyên nhân hàng đầu dẫn tới 68% vụ hỏa hoạn thiết bị điện gia dụng khi chủ nhà vắng mặt hoặc ngủ quên.',
    standardReference: 'TCVN 5699-1:2010 (IEC 60335-1) - An toàn thiết bị điện gia dụng & SOP-SH-2026 Mục 2.2',
    sensorSource: 'Cảm biến PT100 / Dallas DS18B20 / Cảm biến hồng ngoại không tiếp xúc MLX90614',
    actionAdvice: 'Nếu nhiệt độ vượt ngưỡng khi nhà vắng người, hệ thống sẽ đề xuất ngắt rơ-le nguồn điện khẩn cấp.',
  },

  kalman_temp_c: {
    key: 'kalman_temp_c',
    name: 'Nhiệt Độ Làm Mượt Qua Bộ Lọc Kalman',
    shortName: 'Kalman Smoothed',
    category: 'ai_math',
    unit: 'Độ Celsius',
    unitSymbol: '°C',
    formulaText: 'K_k = P_pred / (P_pred + R); x_est = x_pred + K_k * (z_k - x_pred)',
    formulaLatex: 'K_k = \\frac{P_{k|k-1}}{P_{k|k-1} + R}, \\quad \\hat{x}_{k|k} = \\hat{x}_{k|k-1} + K_k(z_k - \\hat{x}_{k|k-1})',
    description: 'Giá trị nhiệt độ ước lượng tối ưu sau khi loại bỏ nhiễu trắng và các xung đột ngột của cảm biến vật lý.',
    detailedExplanation: 'Cảm biến thực tế trong môi trường gia đình thường bị nhiễu do sóng điện từ (EMI từ bếp từ, quạt gió). Bộ lọc Kalman 1 chiều tính toán độ lợi K_k tại mỗi chu kỳ lấy mẫu để cân bằng giữa quán tính nhiệt của mô hình và giá trị đo tức thời, giúp hệ số cảnh báo giả giảm tới 82%.',
    normalRange: {
      min: 18.0,
      max: 35.0,
      description: 'Bám sát giá trị nhiệt độ trung bình thực với độ lệch phương sai < 0.05°C',
    },
    whyItMatters: 'Tránh các báo động giả (False Positives) làm gián đoạn sinh hoạt gia đình hoặc tự ý ngắt điện khi chỉ có xung nhiễu điện từ thoáng qua.',
    standardReference: 'Thuật toán Kalman Filter 1960 (R. E. Kalman) - Journal of Basic Engineering',
    sensorSource: 'Xử lý số tín hiệu DSP tại Stream Worker (Layer 2)',
    actionAdvice: 'Theo dõi đường cong xanh lá trên biểu đồ: đường cong phẳng mịn thể hiện thiết bị hoạt động ổn định.',
  },

  heat_index_c: {
    key: 'heat_index_c',
    name: 'Chỉ Số Cảm Giác Nhiệt (Heat Index)',
    shortName: 'Heat Index',
    category: 'environment_air',
    unit: 'Độ Celsius',
    unitSymbol: '°C',
    formulaText: 'HI = c1 + c2*T + c3*R + c4*T*R + ... (Xấp xỉ phương trình hồi quy đa biến Rothfusz/Steadman)',
    formulaLatex: 'HI = c_1 + c_2 T + c_3 R + c_4 T R + c_5 T^2 + c_6 R^2 + c_7 T^2 R + c_8 T R^2 + c_9 T^2 R^2',
    description: 'Chỉ số phản ánh nhiệt độ thực tế mà cơ thể con người cảm nhận khi kết hợp cả nhiệt độ không khí và độ ẩm tương đối.',
    detailedExplanation: 'Khi độ ẩm không khí tăng cao, mồ hôi trên da khó bay hơi làm giảm khả năng tự làm mát tự nhiên của cơ thể. Một căn phòng 28°C nhưng độ ẩm 85% sẽ cho cảm giác bức bối tương đương 34°C, gây mệt mỏi và làm tăng tải hoạt động của hệ thống điều hòa.',
    normalRange: {
      min: 20.0,
      max: 29.0,
      description: '20.0°C - 29.0°C: Thoải mái, dễ chịu, an toàn cho người già và trẻ nhỏ',
    },
    warningThreshold: {
      value: 32.0,
      description: '32.0°C - 41.0°C: Thận trọng đặc biệt - Nguy cơ sốc nhiệt và mất nước khi vận động',
    },
    dangerThreshold: {
      value: 41.0,
      description: '> 41.0°C: Cực kỳ nguy hiểm - Nguy cơ đột quỵ nhiệt và kiệt sức',
    },
    whyItMatters: 'Giúp điều khiển điều hòa thông minh dựa trên độ dễ chịu sinh học thay vì chỉ bám theo nhiệt độ khô.',
    standardReference: 'Quy chuẩn Khí tượng Thủy văn Hoa Kỳ (NOAA National Weather Service Heat Index Scale)',
    sensorSource: 'Tính toán hợp nhất từ cảm biến Nhiệt độ + Cảm biến Độ ẩm',
    actionAdvice: 'Nên kích hoạt chế độ hút ẩm (Dry Mode) hoặc hạ 1°C điều hòa khi Heat Index > 30°C.',
  },

  power_watts: {
    key: 'power_watts',
    name: 'Công Suất Tiêu Thụ Điện Năng P',
    shortName: 'Công Suất P',
    category: 'thermal_power',
    unit: 'Watt',
    unitSymbol: 'W',
    formulaText: 'P = U * I * cos(phi) (Công suất tác dụng 1 pha)',
    formulaLatex: 'P = U \\cdot I \\cdot \\cos(\\varphi)',
    description: 'Tổng công suất điện tức thời mà thiết bị đang tiêu thụ từ nguồn điện lưới 220V.',
    detailedExplanation: 'Được đo bằng biến dòng biến áp (CT Sensor) hoặc chip đo đếm chuyên dụng (HLW8032/BL0937) với hệ số công suất cosφ. Giúp phát hiện hiện tượng rò điện, thiết bị hoạt động ngầm ngoài ý muốn hoặc quá tải định mức thanh dẫn.',
    normalRange: {
      min: 0.0,
      max: 2200.0,
      description: 'Bếp từ: 200W - 2200W; Điều hòa: 350W - 1800W; TV/Quạt: 40W - 150W; Chờ (Standby): 0.5W - 5W',
    },
    warningThreshold: {
      value: 2000.0,
      description: '> 2000W liên tục > 30 phút hoặc công suất phát sinh khi vắng nhà > 500W',
    },
    dangerThreshold: {
      value: 2500.0,
      description: '> 2500W: Vượt quá tiết diện dây dẫn nhánh gia đình 2.5mm², nguy cơ nóng chảy vỏ cách điện',
    },
    whyItMatters: 'Giám sát chi phí tiền điện, ngăn ngừa tình trạng quá tải aptomat nhánh và phát hiện thiết bị quên tắt khi rời nhà.',
    standardReference: 'TCVN 7447 (IEC 60364) - Hệ thống lắp đặt điện hạ áp cho nhà ở',
    sensorSource: 'Cảm biến dòng CT Clamp SCT-013 & Biến áp đo áp ZMPT101B',
    actionAdvice: 'Nếu công suất > 1500W khi trạng thái phòng là VẮNG NHÀ, hệ thống sẽ gửi cảnh báo khẩn cấp.',
  },

  current_a: {
    key: 'current_a',
    name: 'Cường Độ Dòng Điện Phụ Tải I',
    shortName: 'Dòng Điện I',
    category: 'thermal_power',
    unit: 'Ampe',
    unitSymbol: 'A',
    formulaText: 'I = P / (U * cos(phi))',
    formulaLatex: 'I = \\frac{P}{U \\cdot \\cos(\\varphi)} = \\sqrt{\\frac{1}{T}\\int_0^T i^2(t)\\,dt}',
    description: 'Dòng điện hiệu dụng (RMS Current) chạy qua dây dẫn cấp nguồn cho thiết bị.',
    detailedExplanation: 'Dòng điện đo lường tải thực tế. Khi máy nén điều hòa bị nghẽn gas, kẹt cơ khí hoặc bếp từ hỏng tụ cộng hưởng, dòng điện I sẽ vọt lên bất thường ngay cả khi công suất biểu kiến chưa chạm đỉnh.',
    normalRange: {
      min: 0.0,
      max: 10.0,
      description: '0.0A - 10.0A (Tải gia đình thông thường qua ổ cắm 16A)',
    },
    warningThreshold: {
      value: 10.5,
      description: '> 10.5A đối với điều hòa gia đình Inverter (Compressor Surge Alert)',
    },
    dangerThreshold: {
      value: 16.0,
      description: '> 16.0A: Vượt dòng định mức tiếp điểm rơ-le và ổ cắm, nguy cơ phóng điện hồ quang',
    },
    whyItMatters: 'Bảo vệ dây dẫn không bị quá nhiệt Joule (Q = I²Rt), chống cháy lớp vỏ PVC cách điện.',
    standardReference: 'IEC 60898 - Thiết bị bảo vệ quá dòng cho gia đình',
    sensorSource: 'Cảm biến Hall Effect ACS712 / SCT-013',
    actionAdvice: 'Nếu dòng điện tăng vọt > 12A, chuyển ngay điều hòa sang chế độ ECO Mode để hạ xung nhịp máy nén.',
  },

  voltage_v: {
    key: 'voltage_v',
    name: 'Điện Áp Nguồn Lưới U',
    shortName: 'Điện Áp U',
    category: 'thermal_power',
    unit: 'Volt',
    unitSymbol: 'V',
    formulaText: 'U = U_rms (Điện áp hiệu dụng xoay chiều 50Hz)',
    formulaLatex: 'U_{\\text{rms}} = \\sqrt{\\frac{1}{T}\\int_0^T u^2(t)\\,dt}',
    description: 'Điện áp hiệu dụng cung cấp từ lưới điện xoay chiều một pha 220V/50Hz.',
    detailedExplanation: 'Đo lường độ ổn định của lưới điện. Sụt áp (< 190V) làm động cơ máy nén phát nhiệt cao và giảm tuổi thọ; Quá áp (> 245V) gây nổ tụ bảo vệ và cháy bộ nguồn xung (SMPS).',
    normalRange: {
      min: 200.0,
      max: 235.0,
      description: '200V - 235V (Dải hoạt động tối ưu theo tiêu chuẩn điện lực EVN)',
    },
    warningThreshold: {
      value: 190.0,
      description: '< 190V (Sụt áp nặng) hoặc > 240V (Quá áp nhẹ)',
    },
    dangerThreshold: {
      value: 250.0,
      description: '> 250V: Nguy cơ đánh thủng linh kiện bán dẫn và nổ tụ lọc nguồn',
    },
    whyItMatters: 'Bảo vệ toàn bộ thiết bị điện tử nhạy cảm (Smart TV, Bếp từ, Bo mạch Inverter) khỏi sốc điện.',
    standardReference: 'Quy chuẩn Kỹ thuật Quốc gia QCVN QĐ-EVN về chất lượng điện năng hạ áp',
    sensorSource: 'Mạch biến áp mẫu cách ly ZMPT101B',
    actionAdvice: 'Nếu điện áp thường xuyên dao động > 10%, nên trang bị ổn áp tự động hoặc thiết bị cắt lọc sét lan truyền.',
  },

  // ==========================================================================
  // 2. MÔI TRƯỜNG & KHÔNG KHÍ
  // ==========================================================================
  humidity_pct: {
    key: 'humidity_pct',
    name: 'Độ Ẩm Tương Đối Không Khí (Relative Humidity)',
    shortName: 'Độ Ẩm',
    category: 'environment_air',
    unit: 'Phần trăm',
    unitSymbol: '%',
    formulaText: 'RH = (Áp suất riêng phần hơi nước / Áp suất hơi nước bão hòa) * 100%',
    formulaLatex: 'RH = \\frac{e}{e_s(T)} \\times 100\\%',
    description: 'Tỷ lệ phần trăm giữa lượng hơi nước hiện có trong không khí so với lượng hơi nước tối đa không khí có thể chứa ở cùng nhiệt độ.',
    detailedExplanation: 'Độ ẩm ảnh hưởng lớn đến sức khỏe hô hấp và độ an toàn của thiết bị điện tử. Độ ẩm quá cao (> 80%) tạo môi trường cho nấm mốc phát triển, gây rỉ sét linh kiện và rò rỉ điện bề mặt. Độ ẩm quá thấp (< 30%) gây khô da và tĩnh điện (ESD).',
    normalRange: {
      min: 45.0,
      max: 68.0,
      description: '45% - 68%: Dải tiện nghi lý tưởng cho nhà ở theo chuẩn ASHRAE 55',
    },
    warningThreshold: {
      value: 75.0,
      description: '> 75%: Nguy cơ đọng sương trên tường, ẩm mốc đồ gỗ và rỉ sét mạch điện',
    },
    dangerThreshold: {
      value: 88.0,
      description: '> 88%: Nguy cơ phóng điện rò rỉ (Tracking Index breakdown) trong hộp điện',
    },
    whyItMatters: 'Ngăn ngừa ẩm mốc hại phổi, bảo vệ độ bền cách điện của các bo mạch vi xử lý trong nhà thông minh.',
    standardReference: 'Tiêu chuẩn Tiện nghi Nhiệt ASHRAE Standard 55 & TCVN 5687:2010',
    sensorSource: 'Cảm biến điện dung Sensirion SHT31 / SHT40 độ chính xác cao ±1.5% RH',
    actionAdvice: 'Nếu độ ẩm > 75%, kích hoạt máy hút ẩm hoặc chuyển điều hòa sang chế độ Dry.',
  },

  dew_point_c: {
    key: 'dew_point_c',
    name: 'Nhiệt Độ Điểm Sương (Dew Point)',
    shortName: 'Điểm Sương',
    category: 'environment_air',
    unit: 'Độ Celsius',
    unitSymbol: '°C',
    formulaText: 'Td = (b * alpha) / (a - alpha); alpha = (a*T)/(b+T) + ln(RH/100) (Magnus-Tetens Formula)',
    formulaLatex: 'T_d = \\frac{b \\cdot \\alpha(T, RH)}{a - \\alpha(T, RH)}, \\quad \\alpha = \\frac{a T}{b + T} + \\ln\\left(\\frac{RH}{100}\\right)',
    description: 'Nhiệt độ mà tại đó khối không khí ẩm bị làm lạnh đến mức hơi nước bắt đầu ngưng tụ thành các giọt sương lỏng.',
    detailedExplanation: 'Nếu nhiệt độ bề mặt của đường ống đồng điều hòa, kính cửa sổ hoặc vỏ kim loại tủ lạnh thấp hơn hoặc bằng Nhiệt độ Điểm Sương, nước sẽ lập tức ngưng tụ đọng giọt. Trong tủ điện thông minh, hiện tượng này có thể gây chập mạch đoản mạch nguy hiểm.',
    normalRange: {
      min: 10.0,
      max: 18.0,
      description: '10.0°C - 18.0°C: Không khí khô ráo, không có nguy cơ đọng nước trên tường',
    },
    warningThreshold: {
      value: 21.0,
      description: '> 21.0°C: Cảm giác ngột ngạt rõ rệt, dễ đọng nước trên bề mặt sàn gạch (hiện tượng Nồm ẩm)',
    },
    dangerThreshold: {
      value: 24.0,
      description: '> 24.0°C: Độ ngưng tụ cực mạnh, nguy cơ đọng nước bên trong ống dẫn điện',
    },
    whyItMatters: 'Dự báo chính xác hiện tượng Nồm ẩm miền Bắc và chống ngưng tụ nước gây chập cháy thiết bị điện tử.',
    standardReference: 'Công thức khí động học Magnus-Tetens (a=17.27, b=237.7°C)',
    sensorSource: 'Tính toán nội suy vi xử lý từ Nhiệt độ & Độ ẩm',
    actionAdvice: 'Đóng kín cửa và bật chế độ hút ẩm khi Điểm Sương vượt 20°C vào mùa Nồm.',
  },

  pm25_ugm3: {
    key: 'pm25_ugm3',
    name: 'Nồng Độ Bụi Siêu Mịn PM2.5',
    shortName: 'Bụi Mịn PM2.5',
    category: 'environment_air',
    unit: 'Microgram trên mét khối',
    unitSymbol: 'µg/m³',
    formulaText: 'Nồng độ hạt bụi có đường kính khí động học <= 2.5 micromet',
    formulaLatex: '\\text{PM}_{2.5} \\le 2.5\\,\\mu\\text{m} \\; (\\mu\\text{g}/\\text{m}^3)',
    description: 'Mật độ các hạt bụi siêu mịn lơ lửng trong không khí có kích thước nhỏ hơn 1/30 sợi tóc người.',
    detailedExplanation: 'Bụi PM2.5 sinh ra từ nấu nướng chiên xào (bếp từ/khói dầu), đốt than củi, khói thuốc lá hoặc bụi mịn xâm nhập từ ngoài đường phố. Do kích thước cực nhỏ, hạt bụi có thể xuyên qua phế nang vào máu, gây bệnh tim mạch và hô hấp mạn tính.',
    normalRange: {
      min: 0.0,
      max: 25.0,
      description: '0 - 25 µg/m³: Không khí trong lành theo khuyến nghị của Tổ chức Y tế Thế giới (WHO)',
    },
    warningThreshold: {
      value: 35.0,
      description: '35 - 75 µg/m³: Nhóm người nhạy cảm (trẻ nhỏ, người hen suyễn) bắt đầu bị ảnh hưởng',
    },
    dangerThreshold: {
      value: 100.0,
      description: '> 100 µg/m³: Ô nhiễm nghiêm trọng do cháy khét đồ ăn hoặc khói thuốc nồng độ cao',
    },
    whyItMatters: 'Tự động kích hoạt quạt hút mùi nhà bếp và máy lọc không khí màng lọc HEPA khi phát hiện nấu nướng.',
    standardReference: 'Quy chuẩn Hướng dẫn Chất lượng Không khí WHO Air Quality Guidelines 2021',
    sensorSource: 'Cảm biến tán xạ Laser quang học Plantower PMS7003 / Sensirion SPS30',
    actionAdvice: 'Nếu PM2.5 > 50 µg/m³, bật quạt hút mùi công suất cao và đóng kín cửa sổ hướng đường lớn.',
  },

  aqi_index: {
    key: 'aqi_index',
    name: 'Chỉ Số Chất Lượng Không Khí AQI (Air Quality Index)',
    shortName: 'Chỉ Số AQI',
    category: 'environment_air',
    unit: 'Điểm số chuẩn hóa AQI',
    unitSymbol: 'AQI',
    formulaText: 'AQI = [(I_high - I_low)/(C_high - C_low)] * (C - C_low) + I_low (EPA Standard)',
    formulaLatex: 'I_p = \\frac{I_{\\text{hi}} - I_{\\text{lo}}}{BP_{\\text{hi}} - BP_{\\text{lo}}} (C_p - BP_{\\text{lo}}) + I_{\\text{lo}}',
    description: 'Chỉ số đo lường mức độ sạch hoặc ô nhiễm của không khí tổng hợp theo thang điểm quy chuẩn quốc tế 0 - 500.',
    detailedExplanation: 'Chuyển đổi nồng độ các chất ô nhiễm (PM2.5, PM10, CO, VOC) thành một con số đơn giản trực quan dễ theo dõi với các mã màu: Xanh lá (Tốt 0-50), Vàng (Trung bình 51-100), Cam (Kém 101-150), Đỏ (Xấu 151-200), Tím/Nâu (Nguy hại >200).',
    normalRange: {
      min: 0.0,
      max: 50.0,
      description: '0 - 50 (Xanh lá): Chất lượng không khí tuyệt vời, an toàn cho mọi thành viên',
    },
    warningThreshold: {
      value: 100.0,
      description: '101 - 150 (Màu Cam): Kém - Cần bật máy lọc khí trong phòng ngủ',
    },
    dangerThreshold: {
      value: 150.0,
      description: '> 150 (Màu Đỏ): Xấu - Cần đóng cửa sổ và kích hoạt chế độ lọc khí tối đa',
    },
    whyItMatters: 'Cho phép chủ nhà nắm bắt ngay tình trạng không khí gia đình chỉ qua một cái nhìn lướt nhanh.',
    standardReference: 'Quyết định số 1459/QĐ-TCMT của Tổng cục Môi trường Việt Nam (VN_AQI)',
    sensorSource: 'Hợp nhất dữ liệu từ PM2.5, VOC và CO2',
    actionAdvice: 'Duy trì AQI phòng ngủ dưới 40 để có giấc ngủ sâu và tái tạo năng lượng tốt nhất.',
  },

  presence_pir: {
    key: 'presence_pir',
    name: 'Cảm Biến Hiện Diện Thân Nhiệt PIR (Passive Infrared)',
    shortName: 'Hiện Diện PIR',
    category: 'system_safety',
    unit: 'Trạng thái Nhị phân',
    unitSymbol: 'Boolean (1/0)',
    formulaText: 'PIR = True (Có người chuyển động thân nhiệt) | False (Vắng nhà)',
    formulaLatex: '\\text{PIR} = \\begin{cases} 1 & \\text{khi phát hiện bức xạ hồng ngoại } \\lambda \\approx 10\\,\\mu\\text{m} \\\\ 0 & \\text{khi không có chuyển động} \\end{cases}',
    description: 'Phát hiện sự hiện diện của con người dựa trên sự thay đổi bức xạ tia hồng ngoại phát ra từ thân nhiệt cơ thể.',
    detailedExplanation: 'Cảm biến sử dụng tinh thể Pyroelectric kết hợp thấu kính Fresnel chia nhỏ không gian thành các vùng quang học. Khi con người di chuyển qua các vùng, tín hiệu điện áp vi sai được khuếch đại. Đây là biến trạng thái cốt lõi để AI phân biệt giữa sự cố khẩn cấp (quá nhiệt khi vắng nhà) và sinh hoạt bình thường (đun nấu khi có người).',
    normalRange: {
      min: 0,
      max: 1,
      description: 'CÓ NGƯỜI (Khi phòng có hoạt động) / VẮNG NHÀ (Khi phòng trống > 15 phút)',
    },
    whyItMatters: 'Ngăn ngừa các quyết định can thiệp sai của AI (như tự ý tắt bếp khi người dùng đang đứng nấu ăn tại bếp).',
    standardReference: 'Quy chuẩn Smart Home Security & Automation Motion Standard',
    sensorSource: 'Cảm biến hồng ngoại thụ động PIR HC-SR501 / Panasonic PaPIRs',
    actionAdvice: 'Nếu trạng thái là VẮNG NHÀ mà bếp từ hoặc lò sưởi hoạt động > 10 phút, hệ thống sẽ kích hoạt quy trình cách ly khẩn cấp.',
  },

  vibration_mms2: {
    key: 'vibration_mms2',
    name: 'Độ Rung Động Cơ Học (Vibration Velocity)',
    shortName: 'Độ Rung',
    category: 'thermal_power',
    unit: 'Milimet trên giây bình phương',
    unitSymbol: 'mm/s²',
    formulaText: 'a_rms = sqrt(1/N * sum(a_x^2 + a_y^2 + a_z^2)) (Gia tốc rung tổng hợp 3 trục)',
    formulaLatex: 'a_{\\text{rms}} = \\sqrt{\\frac{1}{N}\\sum_{i=1}^N (a_{x,i}^2 + a_{y,i}^2 + a_{z,i}^2)}',
    description: 'Đo lường độ rung lắc cơ học ba trục (X, Y, Z) của block máy nén điều hòa, lồng giặt hoặc quạt hút mùi.',
    detailedExplanation: 'Sử dụng cảm biến gia tốc kế MEMS siêu nhạy để theo dõi độ ổn định cơ học. Độ rung tăng cao là dấu hiệu sớm báo trước vòng bi bị mòn khô dầu mỡ, cánh quạt bị bám bụi mất cân bằng động (unbalance), hoặc chân đế giảm chấn cao su bị lão hóa nứt gãy.',
    normalRange: {
      min: 0.0,
      max: 0.05,
      description: '0.00 - 0.05 mm/s²: Thiết bị hoạt động êm ái, cân bằng động tốt',
    },
    warningThreshold: {
      value: 0.08,
      description: '> 0.08 mm/s²: Cảnh báo mất cân bằng cơ khí, cần vệ sinh màng lọc và cánh quạt',
    },
    dangerThreshold: {
      value: 0.15,
      description: '> 0.15 mm/s²: Rung lắc nghiêm trọng, nguy cơ gãy chốt hãm hoặc vỡ block máy nén',
    },
    whyItMatters: 'Chẩn đoán sớm hao mòn thiết bị (Predictive Maintenance) trước khi động cơ bị kẹt cứng cháy cuộn dây.',
    standardReference: 'Tiêu chuẩn Đánh giá Độ rung Máy móc Cơ khí ISO 10816-1 / ISO 20816',
    sensorSource: 'Cảm biến gia tốc kế kỹ thuật số 3 trục MEMS MPU-6050 / ADXL345',
    actionAdvice: 'Nếu độ rung tăng đột biến, hãy kiểm tra độ siết ốc chân đế máy giặt hoặc vệ sinh cánh quạt gió.',
  },

  noise_db: {
    key: 'noise_db',
    name: 'Mức Độ Ồn Âm Học Môi Trường',
    shortName: 'Mức Độ Ồn',
    category: 'environment_air',
    unit: 'Decibel thang trọng số A',
    unitSymbol: 'dBA',
    formulaText: 'L_p = 20 * log10(p_rms / p0); p0 = 20 microPascal',
    formulaLatex: 'L_{p} = 20 \\log_{10}\\left(\\frac{p_{\\text{rms}}}{p_0}\\right) \\; (\\text{dBA}), \\quad p_0 = 20\\,\\mu\\text{Pa}',
    description: 'Mức áp suất âm thanh của môi trường xung quanh đo bằng micro âm học lọc trọng số A mô phỏng thính giác con người.',
    detailedExplanation: 'Đo lường mức độ yên tĩnh của ngôi nhà. Tiếng ồn âm học bất thường (tiếng rít cọ xát cơ khí, tiếng gõ kim loại lạch cạch) là bằng chứng rõ ràng của sự cố động cơ hỏng hóc hoặc tia lửa điện hồ quang đánh lẹt đẹt.',
    normalRange: {
      min: 25.0,
      max: 42.0,
      description: '25 - 40 dBA: Rất êm ái (tương đương tiếng thì thầm hoặc thư viện yên tĩnh)',
    },
    warningThreshold: {
      value: 55.0,
      description: '55 - 70 dBA: Ồn đáng kể - Tương đương tiếng động cơ xe máy hoặc máy giặt vắt mạnh',
    },
    dangerThreshold: {
      value: 75.0,
      description: '> 75 dBA: Ồn bất thường trong phòng ngủ/phòng khách, nghi vấn lỗi cơ khí nặng',
    },
    whyItMatters: 'Giúp duy trì không gian nghỉ ngơi thư thái và phát hiện sớm các âm thanh bất thường của thiết bị.',
    standardReference: 'Quy chuẩn Kỹ thuật Quốc gia về Tiếng ồn trong khu dân cư QCVN 26:2010/BTNMT',
    sensorSource: 'Micro điện dung MEMS chuyên dụng I2S INMP441',
    actionAdvice: 'Nếu tiếng ồn điều hòa vượt 50 dBA ở tốc độ gió thấp, nên kiểm tra và bôi trơn bạc đạn quạt lồng sóc.',
  },

  // ==========================================================================
  // 3. MÔ HÌNH TOÁN & TRÍ TUỆ NHÂN TẠO (AI / ML)
  // ==========================================================================
  anomaly_score: {
    key: 'anomaly_score',
    name: 'Điểm Dị Thường Tổng Hợp (Isolation Forest Anomaly Score)',
    shortName: 'Anomaly Score',
    category: 'ai_math',
    unit: 'Điểm xác suất chuẩn hóa',
    unitSymbol: 'Score (0 - 1)',
    formulaText: 's(x, n) = 2^(- E(h(x)) / c(n)); c(n) = 2*(ln(n-1) + 0.5772) - 2*(n-1)/n',
    formulaLatex: 's(x, n) = 2^{-\\frac{E(h(x))}{c(n)}}, \\quad c(n) = 2\\left(\\ln(n - 1) + \\gamma\\right) - \\frac{2(n-1)}{n}',
    description: 'Điểm số từ 0.0 đến 1.0 phản ánh mức độ bất thường đa chiều của mẫu dữ liệu hiện tại so với phân phối dữ liệu chuẩn bình thường.',
    detailedExplanation: 'Được tính bằng thuật toán cây cô lập (iForest). Các điểm dữ liệu bất thường (nhiệt độ cao bất ngờ, dòng điện tăng vọt, tiêu thụ điện khi vắng nhà) rất dễ bị cô lập ở các tầng cây nông (độ sâu h(x) nhỏ), dẫn đến điểm số s tiến gần tới 1.0.',
    normalRange: {
      min: 0.0,
      max: 0.45,
      description: '0.00 - 0.45: Hoàn toàn bình thường (Normal in-distribution cluster)',
    },
    warningThreshold: {
      value: 0.60,
      description: '0.60 - 0.74: Dị thường mức trung bình (Suspicious Outlier) -> Cần theo dõi thêm',
    },
    dangerThreshold: {
      value: 0.75,
      description: '>= 0.75: Dị thường nghiêm trọng (Critical Anomaly) -> Tự động kích hoạt LangGraph Multi-Agent',
    },
    whyItMatters: 'Là "ngòi nổ" tự động chuyển giao từ giám sát thời gian thực (Fast ML Path) sang phân tích đa tác tử (Multi-Agent Reasoning).',
    standardReference: 'Nghiên cứu Isolation Forest (F. T. Liu, K. M. Ting, Z. H. Zhou - IEEE ICDM 2008)',
    sensorSource: 'Mô hình học máy scikit-learn IsolationForest tại Layer 2',
    actionAdvice: 'Khi Anomaly Score >= 0.75, hệ thống sẽ tự động bật chu trình chẩn đoán nguyên nhân gốc rễ (RCA).',
  },

  wear_score: {
    key: 'wear_score',
    name: 'Chỉ Số Hao Mòn Linh Kiện (Component Wear Score)',
    shortName: 'Hao Mòn (Wear)',
    category: 'ai_math',
    unit: 'Hệ số suy giảm',
    unitSymbol: 'Score (0 - 1)',
    formulaText: 'Wear = f(Tổng giờ hoạt động nhiệt cao, Số lần sốc dòng, Độ rung tích lũy)',
    formulaLatex: '\\text{Wear} = 1 - \\exp\\left(-\\sum_{t} \\alpha_1 \\cdot T_t \\Delta t - \\sum_k \\alpha_2 \\cdot I_{\\text{surge}, k}^2\\right)',
    description: 'Ước tính mức độ suy giảm chất lượng vật liệu cách điện, thanh điện trở và độ rơ lỏng cơ khí theo thời gian sử dụng.',
    detailedExplanation: 'Mỗi lần thiết bị phải chịu nhiệt độ quá mức (>65°C) hoặc dòng khởi động máy nén tăng vọt, tuổi thọ cách điện của cuộn dây sẽ giảm đi một lượng không thuận nghịch theo định luật Arrhenius. Wear Score tiệm cận 1.0 báo hiệu thiết bị đã hết niên hạn an toàn và rất dễ xảy ra sự cố nổ chập.',
    normalRange: {
      min: 0.0,
      max: 0.40,
      description: '0.00 - 0.40: Linh kiện còn mới, lớp cách điện và cơ khí hoạt động hoàn hảo',
    },
    warningThreshold: {
      value: 0.65,
      description: '0.65 - 0.79: Bắt đầu có dấu hiệu lão hóa, cần vệ sinh và kiểm tra bảo dưỡng định kỳ',
    },
    dangerThreshold: {
      value: 0.80,
      description: '>= 0.80: Lão hóa nặng nề, nguy cơ rò điện đánh thủng vỏ kim loại bất cứ lúc nào',
    },
    whyItMatters: 'Chuyển từ sửa chữa khi đã hỏng (Reactive) sang phòng ngừa rủi ro chủ động từ sớm (Predictive Maintenance).',
    standardReference: 'Mô hình lão hóa nhiệt Arrhenius & Chuẩn IEC 60034-18 về đánh giá độ bền cách điện',
    sensorSource: 'Thuật toán theo dõi tuổi thọ thiết bị tại Diagnostic Agent (Layer 4)',
    actionAdvice: 'Nếu Wear Score > 0.80, tạo lịch bảo trì thay thế thanh nhiệt hoặc nạp gas điều hòa.',
  },

  cosine_sim: {
    key: 'cosine_sim',
    name: 'Độ Tương Đồng Vector Cosine (1024D Dense Cosine Similarity)',
    shortName: 'Cosine Similarity',
    category: 'ai_math',
    unit: 'Hệ số tương đồng',
    unitSymbol: 'S_c (0 - 1)',
    formulaText: 'S_c(A, B) = (A . B) / (||A|| * ||B||) trong không gian 1024 chiều',
    formulaLatex: 'S_c(\\mathbf{u}, \\mathbf{v}) = \\frac{\\mathbf{u} \\cdot \\mathbf{v}}{\\|\\mathbf{u}\\|_2 \\|\\mathbf{v}\\|_2} = \\frac{\\sum_{i=1}^{1024} u_i v_i}{\\sqrt{\\sum u_i^2} \\sqrt{\\sum v_i^2}}',
    description: 'Độ tương đồng góc giữa vector ngữ cảnh sự cố hiện tại và các vector quy chuẩn kỹ thuật SOP trong Qdrant Vector Store.',
    detailedExplanation: 'Mô hình Multilingual-E5-Large mã hóa toàn bộ văn bản và đặc trưng kỹ thuật thành vector dense 1024 chiều. Cosine Similarity càng gần 1.0 (góc lệch θ càng nhỏ) thì tình huống hiện tại càng khớp chính xác với một kịch bản chuẩn trong tài liệu hướng dẫn an toàn.',
    normalRange: {
      min: 0.80,
      max: 1.0,
      description: '0.85 - 1.00: Khớp ngữ cảnh rất cao (High-confidence Retrieval match)',
    },
    warningThreshold: {
      value: 0.60,
      description: '0.60 - 0.79: Khớp tương đối, cần kết hợp suy luận từ mô hình ngôn ngữ lớn (LLM Reasoning)',
    },
    dangerThreshold: {
      value: 0.50,
      description: '< 0.50: Không tìm thấy kịch bản tương đồng trong bộ nhớ tri thức',
    },
    whyItMatters: 'Đảm bảo mọi khuyến nghị của AI Agent đều được đối chiếu (Grounded) trên tài liệu SOP kỹ thuật đã kiểm duyệt.',
    standardReference: 'Multilingual-E5: Text Embeddings for Universal Information Retrieval (Wang et al., 2024)',
    sensorSource: 'Qdrant Vector Database Engine HNSW Index',
    actionAdvice: 'Khi độ tương đồng > 0.90, kế hoạch xử lý được trích xuất trực tiếp từ quy chuẩn đã xác thực.',
  },

  z_score: {
    key: 'z_score',
    name: 'Điểm Độ Lệch Chuẩn Z-Score (Rolling Window 3-Sigma Outlier)',
    shortName: 'Z-Score',
    category: 'ai_math',
    unit: 'Độ lệch chuẩn Sigma',
    unitSymbol: 'Z (Sigma)',
    formulaText: 'Z = (x - mean_w) / std_w',
    formulaLatex: 'Z = \\frac{x_t - \\mu_w}{\\sigma_w}, \\quad |Z| \\ge 3.0 \\implies \\text{Outlier}',
    description: 'Đo lường khoảng cách từ giá trị hiện tại đến giá trị trung bình trượt của cửa sổ thời gian theo đơn vị độ lệch chuẩn σ.',
    detailedExplanation: 'Theo quy tắc 3-Sigma (Three-Sigma Rule of Thumb) của phân phối chuẩn Gauss, 99.73% các giá trị bình thường sẽ nằm trong khoảng ±3σ. Bất kỳ giá trị nào có |Z| >= 3.0 đều có xác suất xuất hiện ngẫu nhiên < 0.27%, tức là chắc chắn có biến cố đột biến.',
    normalRange: {
      min: -2.0,
      max: 2.0,
      description: '-2.0σ đến +2.0σ: Dao động ngẫu nhiên trong dải biến thiên bình thường',
    },
    warningThreshold: {
      value: 2.5,
      description: '2.5σ - 3.0σ: Xu hướng tăng bất thường cần đưa vào danh sách cảnh giác',
    },
    dangerThreshold: {
      value: 3.0,
      description: '|Z| >= 3.0σ: Điểm ngoại lai thống kê chắc chắn (Statistical Outlier)',
    },
    whyItMatters: 'Lọc bỏ các ngoại lai cục bộ trước khi đưa dữ liệu vào huấn luyện mô hình dài hạn.',
    standardReference: 'Quy tắc 3-Sigma trong Thống kê Ứng dụng & Kiểm soát Chất lượng SPC',
    sensorSource: 'Tính toán cửa sổ trượt (Sliding Window 60 mẫu) tại Stream Worker',
    actionAdvice: 'Nếu Z-Score vượt +3.0σ liên tục trong 3 chu kỳ đo, hệ thống sẽ gắn nhãn dị thường chuỗi thời gian.',
  },

  // ==========================================================================
  // 4. MẠNG IOT & GIAO THỨC TRUYỀN TIN
  // ==========================================================================
  mqtt_throughput: {
    key: 'mqtt_throughput',
    name: 'Thông Lượng Tin Nhắn MQTT Broker',
    shortName: 'Tốc Độ MQTT',
    category: 'iot_network',
    unit: 'Tin nhắn trên giây',
    unitSymbol: 'msg/s',
    formulaText: 'Throughput = Tổng số gói tin MQTT nhận được / giây',
    formulaLatex: '\\text{Rate} = \\frac{\\Delta N_{\\text{packets}}}{\\Delta t} \\; (\\text{msg/s})',
    description: 'Tần suất gửi nhận các bản tin dữ liệu cảm biến thời gian thực qua giao thức MQTT 1883 / EMQX / Mosquitto.',
    detailedExplanation: 'Phản ánh độ sống còn và năng lực xử lý của Gateway IoT gia đình. Thông lượng ổn định 20-30 msg/s đảm bảo toàn bộ 4 trạm cảm biến và các thiết bị chấp hành được đồng bộ mượt mà không có hiện tượng mất gói tin.',
    normalRange: {
      min: 15.0,
      max: 40.0,
      description: '15 - 40 msg/s: Hoạt động trơn tru với chu kỳ lấy mẫu 1.8s/trạm',
    },
    warningThreshold: {
      value: 10.0,
      description: '< 10 msg/s: Cảm biến có thể bị gián đoạn kết nối WiFi hoặc nghẽn kênh',
    },
    dangerThreshold: {
      value: 2.0,
      description: '< 2 msg/s: Mất kết nối diện rộng với các trạm cảm biến IoT',
    },
    whyItMatters: 'Đảm bảo dữ liệu thời gian thực không bị trễ nải, giúp phản ứng ngắt điện kịp thời trong vài giây.',
    standardReference: 'Chuẩn Giao thức OASIS MQTT Version 5.0 Standard Specification',
    sensorSource: 'Thống kê mạng từ Mosquitto Broker / WebSocket Proxy',
    actionAdvice: 'Nếu thông lượng giảm mạnh, kiểm tra lại sóng WiFi tại các trạm xa như Ban công.',
  },

  mqtt_latency: {
    key: 'mqtt_latency',
    name: 'Độ Trễ Truyền Dẫn Mạng IoT (Network Latency)',
    shortName: 'Độ Trễ Mạng',
    category: 'iot_network',
    unit: 'Mili giây',
    unitSymbol: 'ms',
    formulaText: 'Latency = Thời gian nhận gói tại Dashboard - Thời gian phát tại Cảm biến',
    formulaLatex: '\\Delta t = t_{\\text{received}} - t_{\\text{sent}} \\; (\\text{ms})',
    description: 'Thời gian cần thiết để một gói tin từ cảm biến IoT truyền qua Message Queue tới màn hình điều hành.',
    detailedExplanation: 'Hệ thống Aegis-IoT sử dụng kiến trúc Edge-to-Cloud tối ưu với WebSocket trực tiếp và RabbitMQ AMQP, giữ cho độ trễ luôn ở mức siêu thấp < 5ms trong mạng nội bộ.',
    normalRange: {
      min: 1.0,
      max: 15.0,
      description: '1.0ms - 15.0ms: Phản hồi tức thời (Sub-second real-time responsiveness)',
    },
    warningThreshold: {
      value: 50.0,
      description: '50ms - 150ms: Mạng có độ trễ nhẹ do tải cao hoặc nhiễu sóng vô tuyến 2.4GHz',
    },
    dangerThreshold: {
      value: 300.0,
      description: '> 300ms: Nghẽn mạng nghiêm trọng, lệnh điều khiển có thể bị chậm trễ',
    },
    whyItMatters: 'Độ trễ thấp quyết định thời gian ngắt nguồn khẩn cấp khi xảy ra sự cố chập điện.',
    standardReference: 'Tiêu chuẩn Mạng Điều khiển Thời gian thực IEC 62439',
    sensorSource: 'Đo lường thời gian khứ hồi RTT (Round Trip Time) qua WebSocket',
    actionAdvice: 'Duy trì Router WiFi ở vị trí trung tâm ngôi nhà để đảm bảo độ trễ luôn < 10ms.',
  },

  // ==========================================================================
  // 5. CƠ SỞ TRI THỨC RAG & VECTOR QDRANT
  // ==========================================================================
  chunk_size: {
    key: 'chunk_size',
    name: 'Kích Thước Phân Đoạn Tài Liệu (RAG Chunk Size)',
    shortName: 'Chunk Size',
    category: 'rag_knowledge',
    unit: 'Số lượng Token',
    unitSymbol: 'Tokens',
    formulaText: 'Độ dài tối đa của 1 đoạn văn bản trước khi nhúng vector 1024D',
    formulaLatex: 'N_{\\text{tokens}} \\in [256, 1024]',
    description: 'Số lượng token (từ/ký tự) được gom nhóm thành một đoạn văn bản độc lập để trích xuất ngữ nghĩa vào Qdrant.',
    detailedExplanation: 'Nếu Chunk Size quá nhỏ (< 128 tokens), ngữ cảnh sẽ bị phân mảnh làm mất thông tin liên kết giữa các điều khoản; Nếu Chunk Size quá lớn (> 1000 tokens), vector embedding sẽ bị "loãng" ngữ nghĩa và giảm độ chính xác khi tìm kiếm đoạn trích cụ thể.',
    normalRange: {
      min: 400,
      max: 600,
      description: '512 tokens: Kích thước tối ưu cho các tài liệu quy chuẩn kỹ thuật SOP Smart Home',
    },
    whyItMatters: 'Tối ưu hóa khả năng trích xuất chính xác điều khoản an toàn trong tài liệu PDF dài hàng chục trang.',
    standardReference: 'RAG Retrieval Optimization Guidelines (OpenAI / Anthropic Best Practices)',
    sensorSource: 'Bộ tiền xử lý PDF Ingestion Engine (PyMuPDF / LangChain Chunker)',
    actionAdvice: 'Khuyến nghị giữ nguyên 512 tokens để đạt độ khớp cao nhất với mô hình Multilingual-E5.',
  },

  chunk_overlap: {
    key: 'chunk_overlap',
    name: 'Độ Chồng Lấn Phân Đoạn (RAG Chunk Overlap)',
    shortName: 'Chunk Overlap',
    category: 'rag_knowledge',
    unit: 'Số lượng Token',
    unitSymbol: 'Tokens',
    formulaText: 'Số token giao thoa giữa 2 phân đoạn liên tiếp nhau',
    formulaLatex: 'N_{\\text{overlap}} \\approx 10\\% - 15\\% \\times \\text{ChunkSize}',
    description: 'Số lượng token được lặp lại ở điểm tiếp giáp giữa hai đoạn văn bản kế tiếp nhau.',
    detailedExplanation: 'Độ chồng lấn đảm bảo rằng một câu văn hoặc bảng thông số kỹ thuật nằm ở ranh giới giữa 2 chunk không bị cắt đứt gãy rời, giữ trọn vẹn ngữ cảnh ngữ nghĩa cho câu hỏi của người dùng.',
    normalRange: {
      min: 50,
      max: 100,
      description: '64 tokens: Đủ để bảo toàn trọn vẹn 1-2 câu văn hoàn chỉnh tại điểm nối',
    },
    whyItMatters: 'Ngăn chặn hiện tượng mất thông tin quan trọng nằm ở phần đuôi của trang tài liệu.',
    standardReference: 'Semantic Boundary Chunking Principles in Information Retrieval',
    sensorSource: 'RAG Ingestion Pipeline',
    actionAdvice: 'Đặt chunk overlap bằng khoảng 10-15% chunk size để đạt hiệu quả cao nhất.',
  },

  top_k: {
    key: 'top_k',
    name: 'Số Lượng Đoạn Trích Dẫn Tối Đa (Top-K Retrieval)',
    shortName: 'Top-K Chunks',
    category: 'rag_knowledge',
    unit: 'Số lượng đoạn trích',
    unitSymbol: 'Chunks',
    formulaText: 'K = Số vector có độ tương đồng Cosine cao nhất được nạp vào LLM Context Window',
    formulaLatex: 'K = |\\text{Top-K}(\\arg\\max S_c)|',
    description: 'Số lượng đoạn trích dẫn có điểm số khớp ngữ nghĩa cao nhất được lấy ra từ Qdrant để làm bằng chứng trả lời.',
    detailedExplanation: 'Top-K cân bằng giữa việc cung cấp đủ bằng chứng phong phú cho mô hình ngôn ngữ lớn (LLM) và việc giữ cho cửa sổ ngữ cảnh (Context Window) ngắn gọn, tập trung, tránh hiện tượng ảo giác (hallucination).',
    normalRange: {
      min: 3,
      max: 7,
      description: '3 - 5 chunks: Đầy đủ thông tin đối chiếu mà không gây loãng câu trả lời',
    },
    whyItMatters: 'Cung cấp bằng chứng minh bạch (Citations) giúp người dùng kiểm chứng câu trả lời từ tài liệu gốc.',
    standardReference: 'Dense Vector Search Top-K Optimization in Qdrant Vector Engine',
    sensorSource: 'Qdrant Vector Database Similarity Search Engine',
    actionAdvice: 'Chọn Top-K = 5 khi muốn tra cứu toàn diện các kịch bản sự cố phức tạp.',
  },

  vector_dims: {
    key: 'vector_dims',
    name: 'Số Chiều Không Gian Vector (Vector Embedding Dimensions)',
    shortName: 'Vector Dims (1024D)',
    category: 'rag_knowledge',
    unit: 'Số chiều không gian',
    unitSymbol: 'Dimensions',
    formulaText: 'Vector v in R^1024 (Multilingual-E5-Large dense vector space)',
    formulaLatex: '\\mathbf{v} \\in \\mathbb{R}^{1024}, \\quad \\|\\mathbf{v}\\|_2 = 1.0',
    description: 'Độ dài của mảng số thực đại diện cho ngữ nghĩa của một đoạn văn bản hoặc mẫu đo lường IoT trong cơ sở dữ liệu vector Qdrant.',
    detailedExplanation: 'Mô hình Multilingual-E5-Large nén ngữ nghĩa đa ngôn ngữ (Việt - Anh) vào không gian 1024 chiều. Mỗi chiều đại diện cho một thuộc tính đặc trưng trừu tượng, cho phép máy tính so sánh sự giống nhau về mặt ý nghĩa giữa câu hỏi của người dùng và điều khoản kỹ thuật.',
    normalRange: {
      min: 1024,
      max: 1024,
      description: '1024 chiều: Chuẩn vector dày (Dense Vector) cho độ chính xác ngữ nghĩa vượt trội',
    },
    whyItMatters: 'Khả năng hiểu chính xác tiếng Việt kỹ thuật chuyên ngành Smart Home mà không bị nhầm lẫn từ đồng âm.',
    standardReference: 'Qdrant Collection Schema Standard: distance=Cosine, size=1024',
    sensorSource: 'Mô hình Deep Learning Embedding Multilingual-E5-Large',
    actionAdvice: 'Toàn bộ 3 bộ sưu tập (incident_telemetry, system_baselines_sop, verified_action_plans) đều đồng bộ chuẩn 1024D.',
  },

  // ==========================================================================
  // 6. AN TOÀN & KHÉP VÒNG PHẢN HỒI (L5)
  // ==========================================================================
  risk_score: {
    key: 'risk_score',
    name: 'Điểm Đánh Giá Rủi Ro An Toàn Tổng Hợp',
    shortName: 'Điểm Rủi Ro',
    category: 'system_safety',
    unit: 'Thang điểm rủi ro',
    unitSymbol: 'Điểm (0 - 100)',
    formulaText: 'Risk = 0.4*Temp_Score + 0.3*Current_Score + 0.2*PIR_Hazard + 0.1*Wear_Score',
    formulaLatex: '\\text{Risk} = \\omega_1 S_{\\text{temp}} + \\omega_2 S_{\\text{current}} + \\omega_3 S_{\\text{pir}} + \\omega_4 S_{\\text{wear}}',
    description: 'Chỉ số rủi ro tổng hợp kết hợp đa cảm biến để xếp hạng mức độ an toàn hiện tại của toàn bộ ngôi nhà từ 0 (Hoàn toàn an toàn) đến 100 (Khẩn cấp nguy hiểm).',
    detailedExplanation: 'AI tổng hợp dữ liệu từ nhiệt độ, dòng tải, trạng thái có/vắng người và độ hao mòn thiết bị để đưa ra một con số đánh giá tổng quan. Giúp người dùng ngay lập tức biết nhà mình đang ở trạng thái nào mà không cần phải tự phân tích từng chỉ số đơn lẻ.',
    normalRange: {
      min: 0,
      max: 25,
      description: '0 - 25: An toàn tuyệt đối (Hệ thống gia đình vận hành ổn định)',
    },
    warningThreshold: {
      value: 50,
      description: '50 - 74: Nguy cơ tiềm ẩn - Phụ tải cao hoặc nhiệt độ thiết bị đang tăng',
    },
    dangerThreshold: {
      value: 75,
      description: '>= 75: Nguy cơ khẩn cấp - Kích hoạt kế hoạch can thiệp tự động hoặc thủ công',
    },
    whyItMatters: 'Cho phép đưa ra quyết định bảo vệ tự động trước khi sự cố chập cháy bùng phát thành ngọn lửa.',
    standardReference: 'Khung Đánh giá Rủi ro An toàn Công nghiệp ISO 31000 & NFPA 70',
    sensorSource: 'Động cơ Phân tích An toàn Aegis AI Safety Engine',
    actionAdvice: 'Khi điểm rủi ro > 70, kiểm tra ngay thông báo cảnh báo và phê duyệt nút ngắt nguồn.',
  },

  energy_saved_watts: {
    key: 'energy_saved_watts',
    name: 'Năng Lượng & Công Suất Tiết Kiệm Được',
    shortName: 'Năng Lượng Tiết Kiệm',
    category: 'system_safety',
    unit: 'Kilowatt giờ / Watt',
    unitSymbol: 'kWh / W',
    formulaText: 'Năng lượng tiết kiệm = Công suất cách ly (W) * Thời gian tránh lãng phí (h)',
    formulaLatex: 'E_{\\text{saved}} = \\sum_{i} P_{\\text{isolated}, i} \\times \\Delta t_i \\; (\\text{kWh})',
    description: 'Tổng lượng điện năng và công suất được tiết kiệm nhờ việc hệ thống tự động ngắt thiết bị bỏ quên hoặc chuyển sang chế độ ECO Mode.',
    detailedExplanation: 'Khi phát hiện bếp từ 2200W hoặc điều hòa 1400W chạy không người, việc ngắt nguồn kịp thời không chỉ ngăn ngừa cháy nổ mà còn tiết kiệm trực tiếp hàng trăm kWh điện lãng phí mỗi tháng cho gia đình.',
    normalRange: {
      min: 0,
      max: 10000,
      description: 'Tích lũy tăng dần theo từng ca sự cố được khép vòng xử lý thành công',
    },
    whyItMatters: 'Minh bạch hóa hiệu quả kinh tế và an toàn thiết thực mà hệ thống Aegis-IoT mang lại cho gia đình.',
    standardReference: 'Chuẩn Quản lý Năng lượng Gia đình ISO 50001',
    sensorSource: 'Verified Action Plans History Store & TimescaleDB',
    actionAdvice: 'Xem chi tiết tại bảng Lịch Sử Kế Hoạch Đã Xác Thực (Verified Plans History).',
  },

  few_shot_memory: {
    key: 'few_shot_memory',
    name: 'Bộ Nhớ Tự Học Khép Vòng Phản Hồi (Few-Shot Feedback Memory)',
    shortName: 'Layer 5 Memory',
    category: 'system_safety',
    unit: 'Số ca sự cố đã học',
    unitSymbol: 'Cases',
    formulaText: 'Upsert(VerifiedPlan -> Qdrant[verified_action_plans])',
    formulaLatex: '\\mathcal{M}_{L5} \\leftarrow \\mathcal{M}_{L5} \\cup \\{\\mathbf{v}_{\\text{incident}}, \\text{Plan}_{\\text{approved}}\\}',
    description: 'Cơ chế tự học thông minh: Khi người dùng bấm nút phê duyệt xử lý sự cố thành công, toàn bộ ngữ cảnh và kế hoạch khắc phục sẽ được vector hóa và lưu vào Qdrant.',
    detailedExplanation: 'Ở những lần sự cố tương tự trong tương lai, Retriever Agent sẽ tìm thấy tiền lệ này với độ tương đồng Cosine cao và đề xuất ngay kế hoạch xử lý tối ưu mà không cần phải suy luận lại từ đầu, giúp thời gian phản ứng nhanh hơn 4 lần.',
    normalRange: {
      min: 1,
      max: 1000,
      description: 'Hệ thống càng vận hành lâu, kho tri thức càng phong phú và thông minh hơn',
    },
    whyItMatters: 'Giúp hệ thống có khả năng tự tiến hóa và thích nghi hoàn hảo với thói quen sinh hoạt của từng gia đình.',
    standardReference: 'Kiến trúc Multi-Agent Closed-Loop Feedback Memory (AGENTS.md Layer 5)',
    sensorSource: 'Qdrant Collection: verified_action_plans',
    actionAdvice: 'Hãy luôn bấm xác nhận sau khi sự cố được khắc phục để bổ sung dữ liệu học cho AI.',
  },
};

/**
 * Tra cứu thông tin metadata của một chỉ số theo mã định danh (key)
 */
export function getMetric(key: string): MetricDefinition | undefined {
  return METRICS_REGISTRY[key];
}

/**
 * Lấy danh sách các chỉ số theo danh mục
 */
export function getMetricsByCategory(category: MetricCategory): MetricDefinition[] {
  return Object.values(METRICS_REGISTRY).filter((m) => m.category === category);
}

/**
 * Tìm kiếm chỉ số theo từ khóa tiếng Việt hoặc mã định danh
 */
export function searchMetrics(query: string): MetricDefinition[] {
  if (!query || !query.trim()) return Object.values(METRICS_REGISTRY);
  const q = query.trim().toLowerCase();
  return Object.values(METRICS_REGISTRY).filter(
    (m) =>
      m.name.toLowerCase().includes(q) ||
      m.shortName.toLowerCase().includes(q) ||
      m.key.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q) ||
      m.detailedExplanation.toLowerCase().includes(q) ||
      m.unit.toLowerCase().includes(q)
  );
}
