import { Link } from "react-router-dom";
import { useEffect, useRef, useState} from "react";
import "./landing.css";

const API_BASE = "http://localhost:5000";

const CLASSIFICATION_COLORS: Record<string, string> = {
  SinusRhythm: "#00ff9d",
  AtrialFibrillation: "#ff4466",
  Inconclusive: "#ffaa00",
  LowHeartRate: "#66aaff",
  HighHeartRate: "#ff6644",
  NotSet: "#888",
};

const CLASSIFICATION_LABELS: Record<string, string> = {
  SinusRhythm: "Sinus Rhythm",
  AtrialFibrillation: "Atrial Fibrillation",
  Inconclusive: "Inconclusive",
  LowHeartRate: "Low Heart Rate",
  HighHeartRate: "High Heart Rate",
  NotSet: "Unknown",
};

interface Sample { t: number; v: number; }
interface ECGSession {
  session_id: string;
  start_time: number;
  end_time: number;
  average_heart_rate: number | null;
  classification: string | null;
  sampling_frequency: number | null;
  number_of_measurements: number | null;
  device_name: string | null;
}

function ECGCanvas({ samples }: { samples: Sample[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const offsetRef = useRef(0);

  useEffect(() => {
    if (!samples || samples.length === 0) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;

    const values = samples.map((s) => s.v);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const VISIBLE = 1500;
    const speed = 2.5;

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += 30) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // Baseline
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();

      const start = Math.floor(offsetRef.current) % Math.max(1, samples.length - VISIBLE);
      const slice = samples.slice(start, start + VISIBLE);
      if (slice.length < 2) return;

      // Glow passes
      [
        { width: 8, alpha: 0.06 },
        { width: 4, alpha: 0.18 },
        { width: 1.5, alpha: 1 },
      ].forEach(({ width, alpha }) => {
        ctx.beginPath();
        ctx.strokeStyle = "#e8003d";
        ctx.globalAlpha = alpha;
        ctx.lineWidth = width;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        slice.forEach((s, i) => {
          const x = (i / (VISIBLE - 1)) * W;
          const y = H - ((s.v - min) / range) * H * 0.8 - H * 0.1;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.globalAlpha = 1;
      });

      // Scan line
      const scanX = (((offsetRef.current % VISIBLE) / VISIBLE) * W + W) % W;
      const grad = ctx.createLinearGradient(scanX - 80, 0, scanX, 0);
      grad.addColorStop(0, "transparent");
      grad.addColorStop(1, "rgba(232,0,61,0.12)");
      ctx.fillStyle = grad;
      ctx.fillRect(scanX - 80, 0, 80, H);

      offsetRef.current += speed * (VISIBLE / W);
      if (offsetRef.current >= samples.length - VISIBLE) offsetRef.current = 0;

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [samples]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "180px", display: "block", borderRadius: 12 }}
    />
  );
}

function formatTime(unix: number) {
  return new Date(unix * 1000).toLocaleString();
}

function SessionCard({ session, isLatest }: { session: ECGSession; isLatest: boolean }) {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [expanded, setExpanded] = useState(isLatest);
  const [loading, setLoading] = useState(false);
  const classification = session.classification || "NotSet";
  const color = CLASSIFICATION_COLORS[classification] || "#888";
  const label = CLASSIFICATION_LABELS[classification] || classification;

  useEffect(() => {
    if (!expanded || samples.length > 0) return;
    fetch(`${API_BASE}/ecg/${session.session_id}`)
      .then((r) => r.json())
      .then((d) => {
        setSamples(d.samples || []);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, [expanded, session.session_id]);

  return (
    <div
      style={{
        borderRadius: 16,
        border: `1px solid rgba(255,255,255,.1)`,
        background: "rgba(255,255,255,.03)",
        overflow: "hidden",
        marginBottom: 12,
      }}
    >
      {/* Header row */}
      <div
        onClick={() => setExpanded((e) => !e)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "16px 20px",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        {/* Classification dot */}
        <div style={{
          width: 10, height: 10, borderRadius: "50%",
          background: color, flexShrink: 0,
          boxShadow: `0 0 8px ${color}`,
        }} />

        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#fff" }}>{label}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", fontWeight: 700, marginTop: 2 }}>
            {formatTime(session.start_time)}
          </div>
        </div>

        {session.average_heart_rate && (
          <div style={{ textAlign: "right", marginRight: 8 }}>
            <div style={{ fontWeight: 900, fontSize: 20, color: "#e8003d" }}>
              {Math.round(session.average_heart_rate)}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", fontWeight: 700 }}>BPM</div>
          </div>
        )}

        {session.number_of_measurements && (
          <div style={{ textAlign: "right", marginRight: 8 }}>
            <div style={{ fontWeight: 900, fontSize: 16, color: "rgba(255,255,255,.8)" }}>
              {session.number_of_measurements.toLocaleString()}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", fontWeight: 700 }}>samples</div>
          </div>
        )}

        <div style={{ color: "rgba(255,255,255,.3)", fontSize: 18, transition: "transform .2s", transform: expanded ? "rotate(180deg)" : "none" }}>
          ↓
        </div>
      </div>

      {/* Waveform */}
      {expanded && (
        <div style={{ padding: "0 20px 20px" }}>
          <div style={{
            background: "rgba(0,0,0,.4)",
            borderRadius: 12,
            padding: 12,
            border: "1px solid rgba(255,255,255,.06)",
          }}>
            {loading ? (
              <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,.3)", fontWeight: 700, fontSize: 13 }}>
                Loading waveform…
              </div>
            ) : samples.length > 0 ? (
              <ECGCanvas samples={samples} />
            ) : (
              <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,.3)", fontWeight: 700, fontSize: 13 }}>
                No sample data available
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            {session.sampling_frequency && (
              <div className="rr-mini" style={{ flex: "1 1 120px" }}>
                <div className="rr-mini__k">Sample Rate</div>
                <div className="rr-mini__v">{session.sampling_frequency} Hz</div>
              </div>
            )}
            {session.device_name && (
              <div className="rr-mini" style={{ flex: "1 1 120px" }}>
                <div className="rr-mini__k">Device</div>
                <div className="rr-mini__v">{session.device_name}</div>
              </div>
            )}
            <div className="rr-mini" style={{ flex: "1 1 120px" }}>
              <div className="rr-mini__k">Duration</div>
              <div className="rr-mini__v">{Math.round(session.end_time - session.start_time)}s</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ECGCollection() {
  const [sessions, setSessions] = useState<ECGSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/ecg/sessions`)
      .then((r) => { if (!r.ok) throw new Error("Failed to fetch"); return r.json(); })
      .then((d) => setSessions(d.sessions || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="rr">
      <header className="rr-nav">
        <div className="rr-nav__inner">
          <Link className="rr-brand" to="/" aria-label="RedlineRanch home">
            <span className="rr-brand__name">RedlineRanch</span>
            <span className="rr-brand__tag">ECG • Fitness • ML</span>
          </Link>
          <div />
          <div className="rr-nav__cta">
            <Link className="rr-btn rr-btn--ghost rr-btn--nav" to="/dashboard">Dashboard</Link>
            <Link className="rr-btn rr-btn--ghost rr-btn--nav" to="/session">Session</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="rr-section">
          <div className="rr-section__inner">
            <h2 className="rr-h2">ECG Collection</h2>
            <p className="rr-lead">
              Your electrocardiogram (ECG) records captured from your Apple Watch are stored here.
              Each ECG is a snapshot of your heart's electrical activity, recorded directly from your wrist.
            </p>

            {/* What is ECG */}
            <div className="rr-feature" style={{ marginTop: 24 }}>
              <h3 style={{ marginTop: 0 }}>What is ECG Collection?</h3>
              <p style={{ color: "rgba(255,255,255,.72)", fontWeight: 700, lineHeight: 1.7, margin: 0 }}>
                An ECG (electrocardiogram) measures the electrical signals that make your heart beat.
                The Apple Watch can record a single-lead ECG in about 30 seconds by placing your finger
                on the Digital Crown. RedlineRanch stores these recordings from your iPhone and displays
                them here so you can track your heart rhythm over time, spot anomalies, and share records
                with a healthcare professional if needed.
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
                <div className="rr-mini" style={{ flex: "1 1 160px" }}>
                  <div className="rr-mini__k">How to record</div>
                  <div className="rr-mini__v" style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.72)" }}>
                    Open Health app → Heart → ECG
                  </div>
                </div>
                <div className="rr-mini" style={{ flex: "1 1 160px" }}>
                  <div className="rr-mini__k">Duration</div>
                  <div className="rr-mini__v">~30 seconds</div>
                </div>
                <div className="rr-mini" style={{ flex: "1 1 160px" }}>
                  <div className="rr-mini__k">Device required</div>
                  <div className="rr-mini__v">Apple Watch Series 4+</div>
                </div>
              </div>
            </div>

            {/* Records */}
            <div className="rr-feature" style={{ marginTop: 18 }}>
              <h3 style={{ marginTop: 0 }}>
                Your ECG Records
                {sessions.length > 0 && (
                  <span style={{ marginLeft: 10, fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.4)" }}>
                    {sessions.length} session{sessions.length !== 1 ? "s" : ""}
                  </span>
                )}
              </h3>

              {loading && (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "rgba(255,255,255,.4)", fontWeight: 700 }}>
                  Loading ECG records…
                </div>
              )}

              {error && (
                <div style={{ padding: "20px", borderRadius: 12, background: "rgba(255,68,102,.1)", border: "1px solid rgba(255,68,102,.2)", color: "#ff4466", fontWeight: 700, fontSize: 13 }}>
                  Could not connect to backend: {error}
                </div>
              )}

              {!loading && !error && sessions.length === 0 && (
                <div style={{
                  marginTop: 14, padding: "40px 20px", borderRadius: 16,
                  border: "1px dashed rgba(255,255,255,.12)", background: "rgba(255,255,255,.02)", textAlign: "center",
                }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📉</div>
                  <div style={{ color: "rgba(255,255,255,.72)", fontWeight: 800, fontSize: 16, marginBottom: 8 }}>
                    No ECG records yet
                  </div>
                  <div style={{ color: "rgba(255,255,255,.4)", fontWeight: 700, fontSize: 13, maxWidth: 380, margin: "0 auto" }}>
                    Record an ECG on your Apple Watch and send it via the RedlineRanch iPhone app. It will appear here automatically.
                  </div>
                </div>
              )}

              {!loading && !error && sessions.map((session, i) => (
                <SessionCard key={session.session_id} session={session} isLatest={i === 0} />
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}