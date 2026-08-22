import React, { useState, useEffect, useRef } from 'react';
import { Atom, Copy, Check, Waves, Trees, Compass, BarChart3, Award, Cpu, BookOpen, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import katex from 'katex';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { sound } from '@/lib/sound';
import { MetricHelpButton } from '@/components/MetricHelpButton';

interface LatexBlockProps {
  math: string;
  block?: boolean;
}

const Latex: React.FC<LatexBlockProps> = ({ math, block = false }) => {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      katex.render(math, containerRef.current, {
        displayMode: block,
        throwOnError: false,
      });
    }
  }, [math, block]);

  return <span ref={containerRef} />;
};

export const EvidenceView: React.FC = () => {
  // Slider states for live calculations
  const [iforestDepth, setIforestDepth] = useState<number>(3.2);
  const [autoencoderLoss, setAutoencoderLoss] = useState<number>(0.18);
  const [kalmanR, setKalmanR] = useState<number>(0.05);
  const [cosineAngle, setCosineAngle] = useState<number>(19.5);
  const [zscoreX, setZscoreX] = useState<number>(32.0);
  const [showRawBibtex, setShowRawBibtex] = useState<boolean>(false);
  const [copiedBibtex, setCopiedBibtex] = useState<boolean>(false);

  // 1. Isolation Forest calculations
  const n = 256;
  const gamma = 0.5772156649;
  const cn = 2.0 * (Math.log(n - 1) + gamma) - (2.0 * (n - 1)) / n;
  const iforestScore = Math.pow(2.0, -(iforestDepth / cn));

  // 2. Autoencoder calculations
  const aeThreshold = 0.45;
  const isAeAnomaly = autoencoderLoss >= aeThreshold;

  // 3. Kalman calculations
  const zk = 78.5;
  const xprev = 26.5;
  const q = 0.05;
  const pprev = 1.0;
  const ppred = pprev + q;
  const kGain = ppred / (ppred + kalmanR);
  const xest = xprev + kGain * (zk - xprev);

  // 4. Cosine calculations
  const rad = cosineAngle * (Math.PI / 180);
  const cosSim = Math.cos(rad);

  // 5. Z-Score calculations
  const mu = 26.5;
  const sigma = 1.2;
  const z = (zscoreX - mu) / sigma;

  const academicPapers = [
    {
      title: "Isolation Forest (Phát hiện ngoại lai phi giám sát)",
      authors: "Fei Tony Liu, Kai Ming Ting, Zhi-Hua Zhou",
      venue: "IEEE International Conference on Data Mining (ICDM)",
      year: "2008",
      keyConcept: "Sử dụng cây phân tách ngẫu nhiên để cô lập nhanh các điểm dị thường với độ phức tạp tuyến tính O(n)."
    },
    {
      title: "Autoencoder Neural Networks for Unsupervised Anomaly Detection",
      authors: "Geoffrey Hinton, Ruslan Salakhutdinov",
      venue: "Science / Neural Computation",
      year: "2006",
      keyConcept: "Mã hóa đa chiều và đo lường sai số tái tạo MSE Loss để phát hiện thoái hóa phần cứng tiềm ẩn."
    },
    {
      title: "A New Approach to Linear Filtering and Prediction Problems",
      authors: "Rudolph Emil Kalman",
      venue: "ASME Journal of Basic Engineering",
      year: "1960",
      keyConcept: "Thuật toán đệ quy tối ưu lọc nhiễu đo lường và ước lượng trạng thái thực của cảm biến vật lý."
    },
    {
      title: "Multilingual-E5: Dense Text Embeddings for Vector Search",
      authors: "Liang Wang, Nan Yang, Furu Wei et al.",
      venue: "Microsoft Research / arXiv:2402.05672",
      year: "2024",
      keyConcept: "Không gian vector 1024 chiều tính khoảng cách Cosine Distance cho hệ thống RAG tri thức kỹ thuật."
    }
  ];

  const bibtexContent = `@inproceedings{liu2008isolation,
  title={Isolation forest},
  author={Liu, Fei Tony and Ting, Kai Ming and Zhou, Zhi-Hua},
  booktitle={2008 Eighth IEEE International Conference on Data Mining},
  pages={413--422},
  year={2008},
  organization={IEEE}
}

@article{hinton2006reducing,
  title={Reducing the dimensionality of data with neural networks},
  author={Hinton, Geoffrey E and Salakhutdinov, Ruslan R},
  journal={Science},
  volume={313},
  number={5786},
  pages={504--507},
  year={2006}
}

@article{kalman1960new,
  title={A new approach to linear filtering and prediction problems},
  author={Kalman, Rudolph Emil},
  journal={Journal of Basic Engineering},
  volume={82},
  number={1},
  pages={35--45},
  year={1960}
}

@article{wang2024multilingual,
  title={Multilingual-E5: Text Embeddings for Universal Information Retrieval},
  author={Wang, Liang and Yang, Nan and Huang, Shaohan and Jiao, Binxing and Yang, Linjun and Jiang, Daxin and Majumder, Rangan and Wei, Furu},
  journal={arXiv preprint arXiv:2402.05672},
  year={2024}
}`;

  const copyBibtex = () => {
    sound.playClick();
    navigator.clipboard.writeText(bibtexContent);
    setCopiedBibtex(true);
    setTimeout(() => setCopiedBibtex(false), 2500);
  };

  return (
    <main className="max-w-7xl mx-auto px-3 sm:px-6 flex-1 w-full space-y-5 pb-12">
      
      {/* HEADER BANNER */}
      <Card className="p-4 sm:p-6 space-y-2 bg-gradient-to-r from-amber-500/10 via-stone-50 to-transparent dark:from-amber-950/30 dark:via-stone-900/50">
        <div className="flex items-center space-x-2 text-xs font-mono text-amber-600 dark:text-amber-400 font-bold">
          <Award className="h-4 w-4" />
          <span>RIGOROUS MATHEMATICAL & MACHINE LEARNING FOUNDATION</span>
        </div>
        <h1 className="font-display font-extrabold text-xl sm:text-2xl text-stone-900 dark:text-white">
          Đặc Tả Công Thức Toán Học & <span className="text-amber-600 dark:text-amber-400">Mô Hình Machine Learning</span>
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 max-w-4xl leading-relaxed">
          Toàn bộ hệ thống Veteran Home vận hành trên nền tảng khoa học dữ liệu chặt chẽ: kết hợp song song bộ đôi mô hình học máy <strong>Isolation Forest</strong> & <strong>Autoencoder</strong> ở Tầng 2, bộ lọc <strong>Kalman Filter</strong> ở Tầng 1, và hàm khoảng cách <strong>Cosine Similarity 1024D</strong> ở Tầng 3 (Qdrant Vector DB).
        </p>
      </Card>

      {/* ========================================================================= */}
      {/* KHỐI 1: BỘ ĐÔI MACHINE LEARNING ANOMALY DETECTION Ở TẦNG 2 (ĐẶT Ở ĐẦU)   */}
      {/* ========================================================================= */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <span className="h-3 w-1 bg-amber-500 rounded-full" />
          <h2 className="text-sm sm:text-base font-bold text-stone-900 dark:text-white font-mono uppercase">
            ⚡ Tầng 2: Bộ Đôi Thuật Toán Học Máy Phát Hiện Bất Thường (Fast ML Path)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* ML Formula 1: Isolation Forest */}
          <Card className="p-4 sm:p-5 space-y-3 flex flex-col justify-between border-l-4 border-l-amber-500 shadow-sm">
            <div>
              <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-2 mb-3">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded">
                    ML MODEL #1
                  </span>
                  <h3 className="font-bold text-sm text-stone-900 dark:text-white">
                    1. Isolation Forest (Điểm Dị Thường s(x, n))
                  </h3>
                </div>
                <div className="flex items-center space-x-2">
                  <MetricHelpButton metricKey="anomaly_score" />
                  <Trees className="h-5 w-5 text-amber-600" />
                </div>
              </div>

              <p className="text-[11.5px] text-stone-500 dark:text-stone-400 mb-2 leading-relaxed">
                👉 <em>Cô lập các điểm ngoại lai đa chiều (Công suất, Dòng điện, Điện áp) với độ phức tạp cực thấp O(n).</em>
              </p>

              <div className="p-3 bg-stone-50 dark:bg-stone-900/70 rounded-xl border border-stone-200/80 dark:border-stone-800 font-mono text-xs space-y-2 overflow-x-auto">
                <div className="text-stone-700 dark:text-stone-300">
                  <strong>Độ dài đường dẫn chuẩn hóa c(n):</strong><br />
                  <Latex math="c(n) = 2 \ln(n - 1) + 0.5772 - \frac{2(n - 1)}{n}" block />
                </div>
                <div className="text-stone-700 dark:text-stone-300 pt-1 border-t border-stone-200 dark:border-stone-800">
                  <strong>Điểm dị thường (Anomaly Score):</strong><br />
                  <Latex math="s(x, n) = 2^{-\frac{E(h(x))}{c(n)}}, \quad s \to 1 \implies \text{Dị Thường}" block />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-200 dark:border-stone-800 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Độ sâu đường dẫn E(h(x)):</span>
                <span className="font-bold text-amber-600">{iforestDepth.toFixed(1)}</span>
              </div>
              <Slider
                min={1}
                max={15}
                step={0.1}
                value={[iforestDepth]}
                onValueChange={(val) => setIforestDepth(val[0])}
              />
              <div className="p-2 bg-amber-50/70 dark:bg-amber-950/30 rounded border border-amber-200 dark:border-amber-900 text-[11px] flex justify-between">
                <span>Điểm dị thường s(x, 256):</span>
                <strong className="text-amber-700 dark:text-amber-300">
                  {iforestScore.toFixed(3)} ({iforestScore > 0.7 ? '🔴 BẤT THƯỜNG CAO' : iforestScore > 0.55 ? '🟡 CẢNH BÁO' : '🟢 BÌNH THƯỜNG'})
                </strong>
              </div>
            </div>
          </Card>

          {/* ML Formula 2: Autoencoder Neural Network (ĐÃ THÊM MỚI VÀO ĐẦU TRANG) */}
          <Card className="p-4 sm:p-5 space-y-3 flex flex-col justify-between border-l-4 border-l-indigo-500 shadow-sm">
            <div>
              <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-2 mb-3">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 rounded">
                    ML MODEL #2
                  </span>
                  <h3 className="font-bold text-sm text-stone-900 dark:text-white">
                    2. Deep Autoencoder (Sai Số Tái Tạo MSE Loss)
                  </h3>
                </div>
                <div className="flex items-center space-x-2">
                  <Cpu className="h-5 w-5 text-indigo-600" />
                </div>
              </div>

              <p className="text-[11.5px] text-stone-500 dark:text-stone-400 mb-2 leading-relaxed">
                👉 <em>Nén và tái tạo tín hiệu cảm biến. Khi linh kiện bị quá nhiệt hoặc thoái hóa, sai số MSE sẽ tăng vọt.</em>
              </p>

              <div className="p-3 bg-stone-50 dark:bg-stone-900/70 rounded-xl border border-stone-200/80 dark:border-stone-800 font-mono text-xs space-y-2 overflow-x-auto">
                <div className="text-stone-700 dark:text-stone-300">
                  <strong>Encoder & Decoder (Mã hóa / Giải mã):</strong><br />
                  <Latex math="z = \text{ReLU}(W_e x + b_e), \quad \hat{x} = \sigma(W_d z + b_d)" block />
                </div>
                <div className="text-stone-700 dark:text-stone-300 pt-1 border-t border-stone-200 dark:border-stone-800">
                  <strong>Sai số tái tạo (Reconstruction Error):</strong><br />
                  <Latex math="\mathcal{L}_{\text{MSE}}(x, \hat{x}) = \frac{1}{d}\sum_{i=1}^d (x_i - \hat{x}_i)^2 = \|x - \hat{x}\|_2^2" block />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-200 dark:border-stone-800 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Sai số tái tạo MSE Loss:</span>
                <span className="font-bold text-indigo-600">{autoencoderLoss.toFixed(2)}</span>
              </div>
              <Slider
                min={0.01}
                max={1.5}
                step={0.01}
                value={[autoencoderLoss]}
                onValueChange={(val) => setAutoencoderLoss(val[0])}
              />
              <div className="p-2 bg-indigo-50/70 dark:bg-indigo-950/30 rounded border border-indigo-200 dark:border-indigo-900 text-[11px] flex justify-between">
                <span>Ngưỡng dị thường (θ = 0.45):</span>
                <strong className={isAeAnomaly ? 'text-rose-700 dark:text-rose-400 font-bold' : 'text-emerald-700 dark:text-emerald-300 font-bold'}>
                  {isAeAnomaly ? '🔴 THOÁI HÓA PHẦN CỨNG / LỖI DỊ THƯỜNG' : '🟢 TÍN HIỆU TÁI TẠO CHUẨN'}
                </strong>
              </div>
            </div>
          </Card>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* KHỐI 2: CÁC NỀN TẢNG TOÁN HỌC & LỌC NHIỄU (TẦNG 1, 2, 3)                  */}
      {/* ========================================================================= */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center gap-2 px-1">
          <span className="h-3 w-1 bg-emerald-500 rounded-full" />
          <h2 className="text-sm sm:text-base font-bold text-stone-900 dark:text-white font-mono uppercase">
            📐 Tầng 1 & 3: Lọc Nhiễu Kalman, Vector Cosine Qdrant & Robust Z-Score
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Formula 3: 1D Kalman Filter */}
          <Card className="p-4 sm:p-5 space-y-3 flex flex-col justify-between border-l-4 border-l-emerald-500 shadow-sm">
            <div>
              <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-2 mb-2">
                <div className="flex items-center space-x-1.5">
                  <span className="px-1.5 py-0.5 text-[9.5px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded">
                    TẦNG 1 & 2
                  </span>
                  <h3 className="font-bold text-xs sm:text-sm text-stone-900 dark:text-white">
                    3. 1D Kalman Filter
                  </h3>
                </div>
                <Waves className="h-4 w-4 text-emerald-600" />
              </div>

              <p className="text-[11px] text-stone-500 dark:text-stone-400 mb-2">
                👉 <em>Khử nhiễu sóng chập chờn trước khi lưu vào TimescaleDB.</em>
              </p>

              <div className="p-2.5 bg-stone-50 dark:bg-stone-900/70 rounded-xl border border-stone-200/80 dark:border-stone-800 font-mono text-[11px] space-y-1.5 overflow-x-auto">
                <Latex math="K_k = \frac{P_{k|k-1}}{P_{k|k-1} + R}" block />
                <Latex math="\hat{x}_{k|k} = \hat{x}_{k|k-1} + K_k(z_k - \hat{x}_{k|k-1})" block />
              </div>
            </div>

            <div className="pt-2 border-t border-stone-200 dark:border-stone-800 space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-stone-500">Nhiễu đo R:</span>
                <span className="font-bold text-emerald-600">{kalmanR.toFixed(2)}</span>
              </div>
              <Slider
                min={0.01}
                max={0.5}
                step={0.01}
                value={[kalmanR]}
                onValueChange={(val) => setKalmanR(val[0])}
              />
              <div className="p-1.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded text-[10.5px] flex justify-between">
                <span>Làm mượt:</span>
                <strong className="text-emerald-700 dark:text-emerald-300">{xest.toFixed(2)} °C</strong>
              </div>
            </div>
          </Card>

          {/* Formula 4: 1024D Dense Cosine */}
          <Card className="p-4 sm:p-5 space-y-3 flex flex-col justify-between border-l-4 border-l-purple-500 shadow-sm">
            <div>
              <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-2 mb-2">
                <div className="flex items-center space-x-1.5">
                  <span className="px-1.5 py-0.5 text-[9.5px] font-mono font-bold bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 rounded">
                    TẦNG 3B
                  </span>
                  <h3 className="font-bold text-xs sm:text-sm text-stone-900 dark:text-white">
                    4. Cosine Similarity
                  </h3>
                </div>
                <Compass className="h-4 w-4 text-purple-600" />
              </div>

              <p className="text-[11px] text-stone-500 dark:text-stone-400 mb-2">
                👉 <em>Truy vấn tương đồng vector trong Qdrant RAG Knowledge Base.</em>
              </p>

              <div className="p-2.5 bg-stone-50 dark:bg-stone-900/70 rounded-xl border border-stone-200/80 dark:border-stone-800 font-mono text-[11px] space-y-1.5 overflow-x-auto">
                <Latex math="S_C(A, B) = \frac{A \cdot B}{\|A\|_2 \|B\|_2}" block />
                <Latex math="D_C(A, B) = 1 - S_C(A, B)" block />
              </div>
            </div>

            <div className="pt-2 border-t border-stone-200 dark:border-stone-800 space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-stone-500">Góc vector θ:</span>
                <span className="font-bold text-purple-600">{cosineAngle.toFixed(0)}°</span>
              </div>
              <Slider
                min={0}
                max={90}
                step={1}
                value={[cosineAngle]}
                onValueChange={(val) => setCosineAngle(val[0])}
              />
              <div className="p-1.5 bg-purple-50/70 dark:bg-purple-950/30 rounded text-[10.5px] flex justify-between">
                <span>Độ khớp S_C:</span>
                <strong className="text-purple-700 dark:text-purple-300">{cosSim.toFixed(3)}</strong>
              </div>
            </div>
          </Card>

          {/* Formula 5: Robust Z-Score */}
          <Card className="p-4 sm:p-5 space-y-3 flex flex-col justify-between border-l-4 border-l-sky-500 shadow-sm">
            <div>
              <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-2 mb-2">
                <div className="flex items-center space-x-1.5">
                  <span className="px-1.5 py-0.5 text-[9.5px] font-mono font-bold bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 rounded">
                    TẦNG 1 & 2
                  </span>
                  <h3 className="font-bold text-xs sm:text-sm text-stone-900 dark:text-white">
                    5. Robust Z-Score
                  </h3>
                </div>
                <BarChart3 className="h-4 w-4 text-sky-600" />
              </div>

              <p className="text-[11px] text-stone-500 dark:text-stone-400 mb-2">
                👉 <em>Bắt xung điện áp bất thường vượt ngưỡng phân phối 3-Sigma.</em>
              </p>

              <div className="p-2.5 bg-stone-50 dark:bg-stone-900/70 rounded-xl border border-stone-200/80 dark:border-stone-800 font-mono text-[11px] space-y-1.5 overflow-x-auto">
                <Latex math="Z = \frac{x - \mu}{\sigma}, \quad |Z| > 3 \implies \text{Outlier}" block />
                <Latex math="\text{IQR} = Q_3 - Q_1" block />
              </div>
            </div>

            <div className="pt-2 border-t border-stone-200 dark:border-stone-800 space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-stone-500">Giá trị x:</span>
                <span className="font-bold text-sky-600">{zscoreX.toFixed(1)} °C</span>
              </div>
              <Slider
                min={20}
                max={40}
                step={0.5}
                value={[zscoreX]}
                onValueChange={(val) => setZscoreX(val[0])}
              />
              <div className="p-1.5 bg-sky-50/70 dark:bg-sky-950/30 rounded text-[10.5px] flex justify-between">
                <span>Z-Score:</span>
                <strong className="text-sky-700 dark:text-sky-300">Z = {z.toFixed(2)}</strong>
              </div>
            </div>
          </Card>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* KHỐI 3: DANH SÁCH TÀI LIỆU KHOA HỌC THAM CHIẾU (THAY THẾ CODE BIBTEX THÔ) */}
      {/* ========================================================================= */}
      <Card className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-3">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-5 w-5 text-amber-600" />
            <div>
              <h3 className="font-bold text-sm sm:text-base text-stone-900 dark:text-white">
                Tài Liệu Nghiên Cứu & Nguồn Gốc Học Thuật (Academic Foundations)
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Các công trình khoa học quốc tế được ứng dụng trong việc xây dựng hệ thống
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowRawBibtex(!showRawBibtex)}
              className="text-xs font-mono"
            >
              {showRawBibtex ? <ChevronUp className="h-3.5 w-3.5 mr-1" /> : <ChevronDown className="h-3.5 w-3.5 mr-1" />}
              <span>{showRawBibtex ? 'Ẩn BibTeX' : 'Xem BibTeX'}</span>
            </Button>

            <Button
              size="sm"
              variant="amber"
              onClick={copyBibtex}
              className="text-xs font-mono space-x-1"
            >
              {copiedBibtex ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>ĐÃ SAO CHÉP</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>SAO CHÉP BIBTEX</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 4 Clean Visual Paper Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {academicPapers.map((paper, idx) => (
            <div 
              key={idx}
              className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800 space-y-1.5"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-bold text-xs sm:text-sm text-stone-900 dark:text-white">
                  {idx + 1}. {paper.title}
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-stone-200 dark:bg-stone-800 font-mono text-[10px] font-bold text-stone-700 dark:text-stone-300 shrink-0">
                  {paper.year}
                </span>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                ✍️ {paper.authors} • <span className="italic">{paper.venue}</span>
              </p>
              <p className="text-[11.5px] text-stone-600 dark:text-stone-400 leading-relaxed">
                {paper.keyConcept}
              </p>
            </div>
          ))}
        </div>

        {/* Collapsible Raw BibTeX (Chỉ hiển thị khi người dùng bấm xem) */}
        {showRawBibtex && (
          <div className="pt-2 animate-in fade-in duration-200">
            <div className="bg-stone-950 text-stone-100 p-4 rounded-xl border border-stone-800 font-mono text-xs overflow-x-auto leading-relaxed">
              <pre className="text-amber-300">{bibtexContent}</pre>
            </div>
          </div>
        )}
      </Card>

    </main>
  );
};
