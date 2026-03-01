import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import "@tensorflow/tfjs";
import * as tf from "@tensorflow/tfjs";
import * as poseDetection from "@tensorflow-models/pose-detection";
import "@mediapipe/pose";

import "./landing.css";

type MissionState = { missionId?: string; missionTitle?: string } | null;

type ExerciseKey = "squat" | "pushup" | "jumping_jacks";

type Exercise = {
  key: ExerciseKey;
  name: string;
  description: string;
};

type KP = poseDetection.Keypoint;

const API = "http://localhost:5000";

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function angleABC(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number }
) {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const magAB = Math.sqrt(ab.x * ab.x + ab.y * ab.y);
  const magCB = Math.sqrt(cb.x * cb.x + cb.y * cb.y);
  const cos = dot / (magAB * magCB + 1e-6);
  const ang = Math.acos(clamp(cos, -1, 1));
  return (ang * 180) / Math.PI;
}

function getKP(keypoints: KP[], name: string, minScore = 0.4) {
  const kp = keypoints.find((k) => k.name === name);
  if (!kp) return null;
  if ((kp.score ?? 1) < minScore) return null;
  return kp;
}

function drawKeypoint(ctx: CanvasRenderingContext2D, kp: KP) {
  ctx.beginPath();
  ctx.arc(kp.x, kp.y, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawLine(ctx: CanvasRenderingContext2D, a: KP, b: KP) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

const EDGES: Array<[string, string]> = [
  ["left_shoulder", "right_shoulder"],
  ["left_hip", "right_hip"],
  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],
  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"],
];

function HeartRateGraph({ metrics }: { metrics: any[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const points = metrics.filter(m => m.heart_rate > 0).slice(-50);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    if (points.length < 2) {
      ctx.fillStyle = "rgba(255,255,255,.3)";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("No heart rate data yet", W / 2, H / 2);
      return;
    }

    const minHR = Math.min(...points.map(p => p.heart_rate)) - 10;
    const maxHR = Math.max(...points.map(p => p.heart_rate)) + 10;
    const pad = { top: 16, bottom: 28, left: 40, right: 12 };
    const gW = W - pad.left - pad.right;
    const gH = H - pad.top - pad.bottom;

    // grid lines
    ctx.strokeStyle = "rgba(255,255,255,.06)";
    ctx.lineWidth = 1;
    [0, 0.25, 0.5, 0.75, 1].forEach(t => {
      const y = pad.top + gH * t;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + gW, y);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.3)";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(Math.round(maxHR - t * (maxHR - minHR)).toString(), pad.left - 4, y + 4);
    });

    // x axis labels
    ctx.fillStyle = "rgba(255,255,255,.3)";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    [0, Math.floor(points.length / 2), points.length - 1].forEach(i => {
      if (!points[i]) return;
      const x = pad.left + (i / (points.length - 1)) * gW;
      const t = new Date(points[i].timestamp * 1000);
      ctx.fillText(`${t.getHours()}:${String(t.getMinutes()).padStart(2, "0")}`, x, H - 4);
    });

    // gradient fill
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + gH);
    grad.addColorStop(0, "rgba(255,176,32,.35)");
    grad.addColorStop(1, "rgba(255,176,32,.0)");

    ctx.beginPath();
    points.forEach((p, i) => {
      const x = pad.left + (i / (points.length - 1)) * gW;
      const y = pad.top + gH - ((p.heart_rate - minHR) / (maxHR - minHR)) * gH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(pad.left + gW, pad.top + gH);
    ctx.lineTo(pad.left, pad.top + gH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // line
    ctx.beginPath();
    ctx.strokeStyle = "rgba(255,176,32,.9)";
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    points.forEach((p, i) => {
      const x = pad.left + (i / (points.length - 1)) * gW;
      const y = pad.top + gH - ((p.heart_rate - minHR) / (maxHR - minHR)) * gH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // latest dot
    const last = points[points.length - 1];
    const lx = pad.left + gW;
    const ly = pad.top + gH - ((last.heart_rate - minHR) / (maxHR - minHR)) * gH;
    ctx.beginPath();
    ctx.arc(lx, ly, 4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,176,32,1)";
    ctx.fill();

  }, [points]);

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ color: "rgba(255,255,255,.72)", fontWeight: 700, fontSize: 13 }}>Heart Rate Over Time</span>
        <span style={{ color: "rgba(255,176,32,.9)", fontWeight: 800, fontSize: 13 }}>
          {points.length > 0 ? `${points[points.length - 1].heart_rate.toFixed(0)} bpm` : "-- bpm"}
        </span>
      </div>
      <canvas
        ref={canvasRef}
        width={600}
        height={140}
        style={{ width: "100%", height: 140, borderRadius: 12, background: "rgba(255,255,255,.03)" }}
      />
    </div>
  );
}

export default function SessionsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const mission = (location.state as MissionState) ?? null;

  const exercises: Exercise[] = useMemo(
    () => [
      {
        key: "squat",
        name: "Squats",
        description: "Depth + knee tracking. Rep counter + basic form hints.",
      },
      {
        key: "pushup",
        name: "Push-ups",
        description: "Elbow bend + body line. Rep counter + depth hint.",
      },
      {
        key: "jumping_jacks",
        name: "Jumping Jacks",
        description: "Hands overhead + feet apart. Rep counter.",
      },
    ],
    []
  );

  const [selectedExercise, setSelectedExercise] = useState<ExerciseKey>("squat");
  const [status, setStatus] = useState<"idle" | "loading" | "running" | "error">("idle");
  const [repCount, setRepCount] = useState(0);
  const [hint, setHint] = useState<string>("");
  const [debug, setDebug] = useState<string>("");
  const [sessionData, setSessionData] = useState<any>(null);
  const [latest, setLatest] = useState<any>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectorRef = useRef<poseDetection.PoseDetector | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const phaseRef = useRef<"up" | "down">("up");
  const repArmedRef = useRef(true);
  const lastRepTimeRef = useRef(0);

  async function setupCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 540 } },
      audio: false,
    });
    streamRef.current = stream;
    const v = videoRef.current!;
    v.srcObject = stream;
    await v.play();
  }

  async function setupDetector() {
    try {
      await tf.setBackend("webgl");
      await tf.ready();
    } catch {
      await tf.setBackend("cpu");
      await tf.ready();
    }
    const detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.BlazePose,
      {
        runtime: "mediapipe",
        modelType: "full",
        solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/pose",
      } as any
    );
    detectorRef.current = detector;
  }

  function cleanup() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (detectorRef.current) {
      detectorRef.current.dispose();
      detectorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  function analyzeAndCount(keypoints: KP[]) {
    const now = performance.now();

    const pickSide = (
      left: [string, string, string],
      right: [string, string, string],
      minScore = 0.4
    ) => {
      const l0 = getKP(keypoints, left[0], minScore);
      const l1 = getKP(keypoints, left[1], minScore);
      const l2 = getKP(keypoints, left[2], minScore);
      const r0 = getKP(keypoints, right[0], minScore);
      const r1 = getKP(keypoints, right[1], minScore);
      const r2 = getKP(keypoints, right[2], minScore);
      const lCount = Number(!!l0) + Number(!!l1) + Number(!!l2);
      const rCount = Number(!!r0) + Number(!!r1) + Number(!!r2);
      if (lCount === 3) return { a: l0!, b: l1!, c: l2!, side: "left" as const };
      if (rCount === 3) return { a: r0!, b: r1!, c: r2!, side: "right" as const };
      if (lCount >= rCount && lCount >= 2) return { a: l0!, b: l1!, c: l2!, side: "left" as const };
      if (rCount >= 2) return { a: r0!, b: r1!, c: r2!, side: "right" as const };
      return null;
    };

    const ls = getKP(keypoints, "left_shoulder", 0.35);
    const rs = getKP(keypoints, "right_shoulder", 0.35);
    const lw = getKP(keypoints, "left_wrist", 0.35);
    const rw = getKP(keypoints, "right_wrist", 0.35);
    const la = getKP(keypoints, "left_ankle", 0.35);
    const ra = getKP(keypoints, "right_ankle", 0.35);
    const shoulderWidth = ls && rs ? Math.max(1, Math.abs(ls.x - rs.x)) : 220;
    const COOLDOWN_MS = 650;

    const tryCountRep = (repPose: boolean, resetPose: boolean) => {
      if (resetPose) repArmedRef.current = true;
      if (repPose && repArmedRef.current && now - lastRepTimeRef.current > COOLDOWN_MS) {
        repArmedRef.current = false;
        lastRepTimeRef.current = now;
        setRepCount((c) => c + 1);
        return true;
      }
      return false;
    };

    let localHint = "";

    if (selectedExercise === "squat") {
      const leg = pickSide(
        ["left_hip", "left_knee", "left_ankle"],
        ["right_hip", "right_knee", "right_ankle"],
        0.4
      );
      if (!leg) { setHint("Move back so hips/knees/ankles are visible."); setDebug(""); return; }
      const kneeAng = angleABC(leg.a, leg.b, leg.c);
      const counted = tryCountRep(kneeAng < 125, kneeAng > 165);
      localHint = counted ? "Rep counted — return to standing to arm the next rep." : kneeAng < 125 ? "Nice depth — now stand tall to reset." : "Stand tall, then squat down to count a rep.";
      setHint(localHint);
      setDebug(`kneeAngle=${Math.round(kneeAng)}°`);
      return;
    }

    if (selectedExercise === "pushup") {
      const arm = pickSide(
        ["left_shoulder", "left_elbow", "left_wrist"],
        ["right_shoulder", "right_elbow", "right_wrist"],
        0.4
      );
      if (!arm) { setHint("Show shoulders, elbows, and wrists for push-up tracking."); setDebug(""); return; }
      const elbowAng = angleABC(arm.a, arm.b, arm.c);
      const counted = tryCountRep(elbowAng < 120, elbowAng > 170);
      localHint = counted ? "Rep counted — extend arms to arm the next rep." : elbowAng < 120 ? "Good depth — press up to reset." : "Lower down (bend elbows) to count a rep.";
      setHint(localHint);
      setDebug(`elbowAngle=${Math.round(elbowAng)}°`);
      return;
    }

    if (selectedExercise === "jumping_jacks") {
      if (!ls || !rs || !lw || !rw || !la || !ra) { setHint("Show wrists, ankles, and shoulders for jumping jack tracking."); setDebug(""); return; }
      const shouldersY = (ls.y + rs.y) / 2;
      const handsUp = lw.y < shouldersY - 30 && rw.y < shouldersY - 30;
      const ankleSpan = Math.abs(la.x - ra.x) / shoulderWidth;
      const feetApart = ankleSpan > 1.35;
      const handsDown = lw.y > shouldersY + 25 && rw.y > shouldersY + 25;
      const feetTogether = ankleSpan < 0.95;
      const counted = tryCountRep(handsUp && feetApart, handsDown && feetTogether);
      localHint = counted ? "Rep counted — return to center (hands down + feet together)." : handsUp && feetApart ? "Nice — now return to center to arm the next rep." : "Open (hands up + feet out) to count a rep.";
      setHint(localHint);
      setDebug(`ankleSpan=${ankleSpan.toFixed(2)} handsUp=${handsUp ? "Y" : "N"}`);
      return;
    }
  }

  async function loop() {
    const v = videoRef.current;
    const c = canvasRef.current;
    const detector = detectorRef.current;
    if (!v || !c || !detector) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const w = v.videoWidth;
    const h = v.videoHeight;
    if (w === 0 || h === 0) { rafRef.current = requestAnimationFrame(loop); return; }
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const poses = await detector.estimatePoses(v, { maxPoses: 1, flipHorizontal: true });
    ctx.clearRect(0, 0, w, h);
    const pose = poses[0];
    if (pose?.keypoints?.length) {
      ctx.save();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(255,255,255,.75)";
      ctx.fillStyle = "rgba(255,176,32,.9)";
      for (const [aName, bName] of EDGES) {
        const a = getKP(pose.keypoints, aName, 0.35);
        const b = getKP(pose.keypoints, bName, 0.35);
        if (a && b) drawLine(ctx, a, b);
      }
      for (const kp of pose.keypoints) {
        if ((kp.score ?? 1) > 0.5) drawKeypoint(ctx, kp);
      }
      ctx.restore();
      analyzeAndCount(pose.keypoints);
    } else {
      setHint("No pose detected — step back and face the camera.");
      setDebug("");
    }
    rafRef.current = requestAnimationFrame(loop);
  }

  async function start() {
    try {
      setStatus("loading");
      setHint("");
      setDebug("");
      setRepCount(0);
      phaseRef.current = "up";
      repArmedRef.current = true;
      lastRepTimeRef.current = 0;
      await setupCamera();
      await setupDetector();
      setStatus("running");
      rafRef.current = requestAnimationFrame(loop);
    } catch (e) {
      console.error(e);
      setStatus("error");
      setHint("Could not start camera/model. Check permissions and try again.");
      setDebug("");
    }
  }

  function stop() {
    cleanup();
    setStatus("idle");
  }

  useEffect(() => {
    return () => cleanup();
  }, []);

  useEffect(() => {
    const fetchData = () => {
      fetch(`${API}/store/sessions/all`)
        .then(r => r.json())
        .then(data => setSessionData(data))
        .catch(err => console.error("sessions error:", err));

      fetch(`${API}/store/latest`)
        .then(r => r.json())
        .then(data => setLatest(data))
        .catch(err => console.error("latest error:", err));

      fetch(`${API}/store/workout/live`)
        .then(r => r.json())
        .then(data => setSessionData((prev: any) => ({ ...prev, workout_metrics: data.metrics ?? [] })))
        .catch(err => console.error("metrics error:", err));
    };

    fetchData(); // fetch immediately on load
    const interval = setInterval(fetchData, 5000); // then every 5 seconds
    return () => clearInterval(interval); // cleanup on unmount
  }, []);

  useEffect(() => {
    setRepCount(0);
    setHint("");
    setDebug("");
    repArmedRef.current = true;
    lastRepTimeRef.current = 0;
  }, [selectedExercise]);

  const workoutSessions = sessionData?.workout_sessions ?? [];
  const ecgSessions = sessionData?.ecg_sessions ?? [];

  const fmt = (val: number | null | undefined, decimals = 0) =>
    val && val > 0 ? val.toFixed(decimals) : "--";

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
            <Link className="rr-btn rr-btn--ghost rr-btn--nav" to="/dashboard">Back</Link>
            <button className="rr-btn rr-btn--primary rr-btn--nav" type="button" onClick={() => navigate("/sessions")}>
              Sessions
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="rr-section">
          <div className="rr-section__inner">
            <h2 className="rr-h2">Session</h2>
            <p className="rr-lead">
              {mission?.missionTitle ? (
                <>Mission: <span style={{ fontWeight: 950 }}>{mission.missionTitle}</span> — pick an exercise and start the camera.</>
              ) : (
                "Pick an exercise and start the camera."
              )}
            </p>

            {/* ── Health Metrics ── */}
            <div className="rr-feature" style={{ marginTop: 18 }}>
              <h3 style={{ marginTop: 0 }}>Health Metrics from Apple Watch</h3>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                <div className="rr-mini" style={{ flex: "1 1 140px" }}>
                  <div className="rr-mini__k">Heart Rate</div>
                  <div className="rr-mini__v">{fmt(latest?.heart_rate)} {latest?.heart_rate > 0 ? "bpm" : ""}</div>
                </div>
                <div className="rr-mini" style={{ flex: "1 1 140px" }}>
                  <div className="rr-mini__k">Resting HR</div>
                  <div className="rr-mini__v">{fmt(latest?.resting_heart_rate)} {latest?.resting_heart_rate > 0 ? "bpm" : ""}</div>
                </div>
                <div className="rr-mini" style={{ flex: "1 1 140px" }}>
                  <div className="rr-mini__k">HRV</div>
                  <div className="rr-mini__v">{fmt(latest?.hrv, 1)} {latest?.hrv > 0 ? "ms" : ""}</div>
                </div>
                <div className="rr-mini" style={{ flex: "1 1 140px" }}>
                  <div className="rr-mini__k">Oxygen Sat</div>
                  <div className="rr-mini__v">
                    {latest?.oxygen_saturation > 0 ? `${(latest.oxygen_saturation * 100).toFixed(1)}%` : "--"}
                  </div>
                </div>
                <div className="rr-mini" style={{ flex: "1 1 140px" }}>
                  <div className="rr-mini__k">HR Recovery</div>
                  <div className="rr-mini__v">{fmt(latest?.heart_rate_recovery)} {latest?.heart_rate_recovery > 0 ? "bpm" : ""}</div>
                </div>
                <div className="rr-mini" style={{ flex: "1 1 140px" }}>
                  <div className="rr-mini__k">AFib Burden</div>
                  <div className="rr-mini__v">
                    {latest?.afib_burden > 0 ? `${(latest.afib_burden * 100).toFixed(1)}%` : "--"}
                  </div>
                </div>
                <div className="rr-mini" style={{ flex: "1 1 140px" }}>
                  <div className="rr-mini__k">VO2 Max</div>
                  <div className="rr-mini__v">{fmt(latest?.vo2_max, 1)} {latest?.vo2_max > 0 ? "ml/kg·min" : ""}</div>
                </div>
              </div>
              {/* Heart Rate Graph */}
              <HeartRateGraph metrics={sessionData?.workout_metrics ?? []} />

              <div style={{ marginTop: 12, color: "rgba(255,255,255,.4)", fontWeight: 700, fontSize: 12 }}>
                {latest
                  ? `Last updated: ${new Date(latest.timestamp * 1000).toLocaleString()}`
                  : "Waiting for data from iPhone..."}
              </div>
            </div>

            {/* ── Exercise picker ── */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 18 }}>
              <div className="rr-links" style={{ justifySelf: "start" }}>
                {exercises.map((ex) => (
                  <button
                    key={ex.key}
                    className="rr-btn rr-btn--ghost"
                    type="button"
                    onClick={() => setSelectedExercise(ex.key)}
                    style={{
                      background: selectedExercise === ex.key ? "rgba(255,255,255,.10)" : "rgba(255,255,255,.06)",
                      borderColor: selectedExercise === ex.key ? "rgba(255,255,255,.22)" : "rgba(255,255,255,.14)",
                    }}
                  >
                    {ex.name}
                  </button>
                ))}
              </div>
              {status !== "running" ? (
                <button className="rr-btn rr-btn--primary" type="button" onClick={start}>
                  {status === "loading" ? "Starting..." : "Start Camera + BlazePose"}
                </button>
              ) : (
                <button className="rr-btn rr-btn--ghost" type="button" onClick={stop}>Stop</button>
              )}
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={{ color: "rgba(255,255,255,.72)", fontWeight: 800 }}>
                {exercises.find((e) => e.key === selectedExercise)?.description}
              </div>
            </div>

            {/* ── Camera + feedback grid ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 14, marginTop: 18 }}>
              <div className="rr-feature">
                <h3 style={{ marginTop: 0 }}>Live Feedback</h3>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                  <div className="rr-mini" style={{ flex: "1 1 160px" }}>
                    <div className="rr-mini__k">Status</div>
                    <div className="rr-mini__v">
                      {status === "idle" && "Idle"}
                      {status === "loading" && "Loading"}
                      {status === "running" && "Running"}
                      {status === "error" && "Error"}
                    </div>
                  </div>
                  <div className="rr-mini" style={{ flex: "1 1 160px" }}>
                    <div className="rr-mini__k">Reps</div>
                    <div className="rr-mini__v">{repCount}</div>
                  </div>
                </div>
                <div style={{ marginTop: 10, color: "rgba(255,255,255,.55)", fontWeight: 700 }}>{debug}</div>
                <div style={{ marginTop: 12 }} className="rr-note">
                  <span className="rr-note__icon">🧠</span>
                  <span>{hint || "Start the camera to get feedback."}</span>
                </div>
                <div style={{ marginTop: 12, color: "rgba(255,255,255,.6)", fontWeight: 700, lineHeight: 1.5 }}>
                  Tip: Stand back so your full body is visible. Good lighting helps pose tracking a lot.
                </div>
              </div>

              <div className="rr-card rr-card--glass" style={{ maxWidth: "100%", position: "relative" }}>
                <div className="rr-card__top">
                  <div className="rr-pill">BlazePose</div>
                  <div className="rr-chip">{status === "running" ? "Live" : "Ready"}</div>
                </div>
                <div style={{ padding: 12, position: "relative" }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: "100%",
                      borderRadius: 18,
                      border: "1px solid rgba(255,255,255,.10)",
                      background: "rgba(0,0,0,.35)",
                      transform: "scaleX(-1)",
                    }}
                  />
                  <canvas
                    ref={canvasRef}
                    style={{
                      position: "absolute",
                      inset: 12,
                      width: "calc(100% - 24px)",
                      height: "calc(100% - 24px)",
                      pointerEvents: "none",
                      borderRadius: 18,
                    }}
                  />
                </div>
                <div className="rr-card__bottom">
                  <div className="rr-note">
                    <span className="rr-note__icon">📌</span>
                    <span>This is demo-grade feedback (not medical). Next step: tighten thresholds per mission + add "form score".</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Past Sessions ── */}
            <div className="rr-feature" style={{ marginTop: 18 }}>
              <h3 style={{ marginTop: 0 }}>Past Sessions</h3>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                <div className="rr-mini" style={{ flex: "1 1 160px" }}>
                  <div className="rr-mini__k">Workout Sessions</div>
                  <div className="rr-mini__v">{workoutSessions.length}</div>
                </div>
                <div className="rr-mini" style={{ flex: "1 1 160px" }}>
                  <div className="rr-mini__k">ECG Sessions</div>
                  <div className="rr-mini__v">{ecgSessions.length}</div>
                </div>
              </div>
              {workoutSessions.length > 0 ? (
                <div style={{ marginTop: 12 }}>
                  {workoutSessions.map((s: any) => (
                    <div key={s.session_id} className="rr-mini" style={{ marginTop: 8 }}>
                      <div className="rr-mini__k">{s.session_id}</div>
                      <div className="rr-mini__v">{new Date(s.start_time * 1000).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ marginTop: 10, color: "rgba(255,255,255,.45)", fontWeight: 700 }}>
                  No sessions yet — send data from your iPhone to see them here.
                </div>
              )}
            </div>

            <style>{`
              @media (max-width: 980px){
                .rr-sessionGrid { grid-template-columns: 1fr; }
              }
            `}</style>
          </div>
        </section>
      </main>
    </div>
  );
}