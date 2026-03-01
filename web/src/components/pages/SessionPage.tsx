import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import "@tensorflow/tfjs";
import * as tf from "@tensorflow/tfjs";
import * as poseDetection from "@tensorflow-models/pose-detection";
import "@mediapipe/pose";

import "./landing.css";

type MissionState = { missionId?: string; missionTitle?: string } | null;
type ExerciseKey = "squat" | "pushup" | "jumping_jacks";
type Exercise = { key: ExerciseKey; name: string; description: string };
type KP = poseDetection.Keypoint;
type SavedSession = {
  id: string;
  exercise: ExerciseKey;
  reps: number;
  avgHeartRate: number | null;
  peakHeartRate: number | null;
  startedAt: number;
  endedAt: number;
  missionTitle?: string;
  aiFeedback?: string;
};
type PlayerState = {
  player_id: string;
  player_name: string;
  exercise: string;
  reps: number;
  heart_rate: number | null;
  updated_at: number;
};

const API = "http://localhost:5000";

function clamp(n: number, a: number, b: number) { return Math.max(a, Math.min(b, n)); }
function angleABC(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) {
  const ab = { x: a.x - b.x, y: a.y - b.y }, cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const cos = dot / (Math.sqrt(ab.x * ab.x + ab.y * ab.y) * Math.sqrt(cb.x * cb.x + cb.y * cb.y) + 1e-6);
  return (Math.acos(clamp(cos, -1, 1)) * 180) / Math.PI;
}
function getKP(keypoints: KP[], name: string, minScore = 0.4) {
  const kp = keypoints.find((k) => k.name === name);
  if (!kp || (kp.score ?? 1) < minScore) return null;
  return kp;
}
function drawKeypoint(ctx: CanvasRenderingContext2D, kp: KP) { ctx.beginPath(); ctx.arc(kp.x, kp.y, 4, 0, Math.PI * 2); ctx.fill(); }
function drawLine(ctx: CanvasRenderingContext2D, a: KP, b: KP) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }

const EDGES: Array<[string, string]> = [
  ["left_shoulder", "right_shoulder"], ["left_hip", "right_hip"],
  ["left_shoulder", "left_hip"], ["right_shoulder", "right_hip"],
  ["left_shoulder", "left_elbow"], ["left_elbow", "left_wrist"],
  ["right_shoulder", "right_elbow"], ["right_elbow", "right_wrist"],
  ["left_hip", "left_knee"], ["left_knee", "left_ankle"],
  ["right_hip", "right_knee"], ["right_knee", "right_ankle"],
];

function getMyTeam() { try { const r = localStorage.getItem("rr_team"); return r ? JSON.parse(r) : null; } catch { return null; } }
function getMyPlayerId() {
  try {
    let id = localStorage.getItem("rr_player_id");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("rr_player_id", id); }
    return id;
  } catch { return "anon"; }
}

// ── AI Feedback Modal ─────────────────────────────────────────────────────────

function FeedbackModal({ feedback, loading, onClose }: { feedback: string; loading: boolean; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#111", border: "1px solid rgba(255,255,255,.12)", borderRadius: 20, padding: 32, maxWidth: 560, width: "100%", boxShadow: "0 0 60px rgba(232,0,61,.15)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#e8003d", boxShadow: "0 0 8px #e8003d" }} />
            <span style={{ fontWeight: 900, fontSize: 16, color: "#fff" }}>Session Summary</span>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, color: "rgba(255,255,255,.6)", fontWeight: 700, fontSize: 13, padding: "4px 14px", cursor: "pointer" }}>Close</button>
        </div>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
            <div style={{ color: "rgba(255,255,255,.5)", fontWeight: 700, fontSize: 14 }}>Analyzing your workout...</div>
          </div>
        ) : (
          <div style={{ color: "rgba(255,255,255,.85)", fontWeight: 600, fontSize: 14, lineHeight: 1.9, whiteSpace: "pre-wrap" }}>{feedback}</div>
        )}
      </div>
    </div>
  );
}

// ── Co-op Partner Card ────────────────────────────────────────────────────────

function PartnerCard({ p, isMe }: { p: PlayerState; isMe?: boolean }) {
  const secAgo = Math.round(Date.now() / 1000 - p.updated_at);
  const live = secAgo < 6;
  return (
    <div className="rr-card rr-card--glass" style={{ border: isMe ? "1px solid rgba(232,0,61,.4)" : "1px solid rgba(255,255,255,.1)", flex: "1 1 200px" }}>
      <div className="rr-card__top">
        <div className="rr-pill">{isMe ? "You" : p.player_name}</div>
        <div className="rr-chip" style={{ background: live ? "rgba(0,200,100,.15)" : "rgba(255,255,255,.06)", color: live ? "rgba(0,220,110,.9)" : "rgba(255,255,255,.3)" }}>
          {live ? "● Live" : `${secAgo}s ago`}
        </div>
      </div>
      <div style={{ padding: "12px 16px 16px" }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>
          {p.exercise.replace(/_/g, " ").toUpperCase()}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div className="rr-mini" style={{ flex: 1 }}>
            <div className="rr-mini__k">Reps</div>
            <div className="rr-mini__v" style={{ fontSize: 28 }}>{p.reps}</div>
          </div>
          <div className="rr-mini" style={{ flex: 1 }}>
            <div className="rr-mini__k">Heart Rate</div>
            <div className="rr-mini__v" style={{ color: "rgba(255,176,32,.9)" }}>
              {p.heart_rate ? `${p.heart_rate.toFixed(0)} bpm` : "--"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Heart Rate Graph ──────────────────────────────────────────────────────────

function HeartRateGraph({ metrics }: { metrics: any[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const points = metrics.filter((m) => m.heart_rate > 0).slice(-50);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    if (points.length < 2) { ctx.fillStyle = "rgba(255,255,255,.3)"; ctx.font = "14px sans-serif"; ctx.textAlign = "center"; ctx.fillText("No heart rate data yet", W / 2, H / 2); return; }
    const minHR = Math.min(...points.map((p) => p.heart_rate)) - 10, maxHR = Math.max(...points.map((p) => p.heart_rate)) + 10;
    const pad = { top: 16, bottom: 28, left: 40, right: 12 }, gW = W - pad.left - pad.right, gH = H - pad.top - pad.bottom;
    ctx.strokeStyle = "rgba(255,255,255,.06)"; ctx.lineWidth = 1;
    [0, 0.25, 0.5, 0.75, 1].forEach((t) => {
      const y = pad.top + gH * t; ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + gW, y); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,.3)"; ctx.font = "10px sans-serif"; ctx.textAlign = "right";
      ctx.fillText(Math.round(maxHR - t * (maxHR - minHR)).toString(), pad.left - 4, y + 4);
    });
    ctx.fillStyle = "rgba(255,255,255,.3)"; ctx.font = "10px sans-serif"; ctx.textAlign = "center";
    [0, Math.floor(points.length / 2), points.length - 1].forEach((i) => {
      if (!points[i]) return; const x = pad.left + (i / (points.length - 1)) * gW; const t = new Date(points[i].timestamp * 1000);
      ctx.fillText(`${t.getHours()}:${String(t.getMinutes()).padStart(2, "0")}`, x, H - 4);
    });
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + gH);
    grad.addColorStop(0, "rgba(255,176,32,.35)"); grad.addColorStop(1, "rgba(255,176,32,.0)");
    ctx.beginPath();
    points.forEach((p, i) => { const x = pad.left + (i / (points.length - 1)) * gW, y = pad.top + gH - ((p.heart_rate - minHR) / (maxHR - minHR)) * gH; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
    ctx.lineTo(pad.left + gW, pad.top + gH); ctx.lineTo(pad.left, pad.top + gH); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
    ctx.beginPath(); ctx.strokeStyle = "rgba(255,176,32,.9)"; ctx.lineWidth = 2; ctx.lineJoin = "round";
    points.forEach((p, i) => { const x = pad.left + (i / (points.length - 1)) * gW, y = pad.top + gH - ((p.heart_rate - minHR) / (maxHR - minHR)) * gH; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
    ctx.stroke();
    const last = points[points.length - 1], lx = pad.left + gW, ly = pad.top + gH - ((last.heart_rate - minHR) / (maxHR - minHR)) * gH;
    ctx.beginPath(); ctx.arc(lx, ly, 4, 0, Math.PI * 2); ctx.fillStyle = "rgba(255,176,32,1)"; ctx.fill();
  }, [points]);
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ color: "rgba(255,255,255,.72)", fontWeight: 700, fontSize: 13 }}>Heart Rate Over Time</span>
        <span style={{ color: "rgba(255,176,32,.9)", fontWeight: 800, fontSize: 13 }}>{points.length > 0 ? `${points[points.length - 1].heart_rate.toFixed(0)} bpm` : "-- bpm"}</span>
      </div>
      <canvas ref={canvasRef} width={600} height={140} style={{ width: "100%", height: 140, borderRadius: 12, background: "rgba(255,255,255,.03)" }} />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SessionsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const mission = (location.state as MissionState) ?? null;
  const myTeam = getMyTeam();
  const myPlayerId = getMyPlayerId();

  const exercises: Exercise[] = useMemo(() => [
    { key: "squat", name: "Squats", description: "Depth + knee tracking. Rep counter + basic form hints." },
    { key: "pushup", name: "Push-ups", description: "Elbow bend + body line. Rep counter + depth hint." },
    { key: "jumping_jacks", name: "Jumping Jacks", description: "Hands overhead + feet apart. Rep counter." },
  ], []);

  const [selectedExercise, setSelectedExercise] = useState<ExerciseKey>("squat");
  const [status, setStatus] = useState<"idle" | "loading" | "running" | "error">("idle");
  const [repCount, setRepCount] = useState(0);
  const [hint, setHint] = useState("");
  const [debug, setDebug] = useState("");
  const [sessionData, setSessionData] = useState<any>(null);
  const [latest, setLatest] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [aiFeedback, setAiFeedback] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [coopPlayers, setCoopPlayers] = useState<PlayerState[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectorRef = useRef<poseDetection.PoseDetector | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const repArmedRef = useRef(true);
  const lastRepTimeRef = useRef(0);
  const processingRef = useRef(false);
  const lastUiUpdateRef = useRef(0);
  const sessionStartRef = useRef<number | null>(null);
  const hrSamplesRef = useRef<number[]>([]);
  const repCountRef = useRef(0);
  const lastPoseSnapshotRef = useRef<KP[] | null>(null);

  useEffect(() => { repCountRef.current = repCount; }, [repCount]);
  useEffect(() => { if (status !== "running" || !latest?.heart_rate) return; hrSamplesRef.current.push(latest.heart_rate); }, [latest, status]);

  // co-op: push my state every 2s while running
  useEffect(() => {
    if (!myTeam?.id || status !== "running") return;
    const push = () => {
      fetch(`${API}/sync/push`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: myTeam.id, player_id: myPlayerId, player_name: myTeam.name, exercise: selectedExercise, reps: repCountRef.current, heart_rate: latest?.heart_rate ?? null }),
      }).catch(() => {});
    };
    push();
    const iv = setInterval(push, 2000);
    return () => clearInterval(iv);
  }, [status, repCount, latest, selectedExercise]);

  // co-op: poll all players every 2s
  useEffect(() => {
    if (!myTeam?.id) return;
    const poll = async () => {
      try {
        const res = await fetch(`${API}/sync/state/${myTeam.id}`);
        if (!res.ok) return;
        const data = await res.json();
        setCoopPlayers((data.players as PlayerState[]) ?? []);
      } catch {}
    };
    poll();
    const iv = setInterval(poll, 2000);
    return () => clearInterval(iv);
  }, [myTeam?.id]);

  function pointsPerRep(ex: ExerciseKey) { return ex === "squat" ? 10 : ex === "pushup" ? 15 : 12; }

  function awardTeamPoints(points: number) {
    try {
      const raw = localStorage.getItem("rr_team"); if (!raw) return;
      const team = JSON.parse(raw);
      localStorage.setItem("rr_team", JSON.stringify({ ...team, points: (Number(team.points) || 0) + points }));
    } catch {}
  }

  function buildPoseSummary(keypoints: KP[] | null): string {
    if (!keypoints) return "No pose data captured.";
    const relevant: Record<ExerciseKey, string[]> = {
      squat: ["left_hip", "left_knee", "left_ankle", "right_hip", "right_knee", "right_ankle"],
      pushup: ["left_shoulder", "left_elbow", "left_wrist", "right_shoulder", "right_elbow", "right_wrist"],
      jumping_jacks: ["left_shoulder", "right_shoulder", "left_wrist", "right_wrist", "left_ankle", "right_ankle"],
    };
    const lines = relevant[selectedExercise].map((name) => {
      const kp = keypoints.find((k) => k.name === name);
      if (!kp || (kp.score ?? 0) < 0.35) return null;
      const height = kp.y < 180 ? "high" : kp.y < 300 ? "mid" : "low";
      return `${name.replace(/_/g, " ")}: ${height} in frame`;
    }).filter(Boolean);
    return lines.length > 0 ? lines.join(", ") : "Pose confidence too low.";
  }

  async function endSession() {
    const samples = hrSamplesRef.current;
    const avgHR = samples.length > 0 ? Math.round(samples.reduce((a, b) => a + b, 0) / samples.length) : null;
    const peakHR = samples.length > 0 ? Math.round(Math.max(...samples)) : null;
    const durationSec = sessionStartRef.current ? Math.round((Date.now() - sessionStartRef.current) / 1000) : 0;
    const exerciseName = exercises.find((e) => e.key === selectedExercise)?.name ?? selectedExercise;
    const step = Math.max(1, Math.floor(samples.length / 10));
    const hrProgression = samples.filter((_, i) => i % step === 0).slice(0, 10);
    const poseSummary = buildPoseSummary(lastPoseSnapshotRef.current);
    const message = `Fitness coach AI. Give brief specific feedback on this workout.
Exercise: ${exerciseName} | Reps: ${repCountRef.current} | Duration: ${durationSec}s${mission?.missionTitle ? ` | Mission: ${mission.missionTitle}` : ""}
HR: avg ${avgHR ?? "N/A"} bpm, peak ${peakHR ?? "N/A"} bpm, trend: ${hrProgression.join("→") || "N/A"}
Key joints: ${poseSummary}
Give: 1 performance summary sentence, 1 form observation, 1 tip. Max 100 words. Be encouraging.`;

    const saved: SavedSession = { id: crypto.randomUUID(), exercise: selectedExercise, reps: repCountRef.current, avgHeartRate: avgHR, peakHeartRate: peakHR, startedAt: sessionStartRef.current ?? Date.now(), endedAt: Date.now(), missionTitle: mission?.missionTitle };
    try { const existing: SavedSession[] = JSON.parse(localStorage.getItem("rr_sessions") ?? "[]"); localStorage.setItem("rr_sessions", JSON.stringify([saved, ...existing])); } catch {}

    cleanup(); setStatus("idle"); setModalOpen(true); setAiLoading(true); setAiFeedback("");
    try {
      const res = await fetch(`${API}/gemini/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) });
      const data = await res.json();
      const reply = data.reply ?? data.response ?? data.message ?? data.text ?? JSON.stringify(data);
      setAiFeedback(reply);
      try {
        const sessions: SavedSession[] = JSON.parse(localStorage.getItem("rr_sessions") ?? "[]");
        if (sessions[0]?.id === saved.id) { sessions[0].aiFeedback = reply; localStorage.setItem("rr_sessions", JSON.stringify(sessions)); }
      } catch {}
    } catch { setAiFeedback("Could not reach the AI coach right now. Your session has been saved locally."); }
    finally { setAiLoading(false); }
  }

  async function setupCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 360 } }, audio: false });
    streamRef.current = stream; const v = videoRef.current!; v.srcObject = stream; await v.play();
  }

  async function setupDetector() {
    try { await tf.setBackend("webgl"); await tf.ready(); } catch { await tf.setBackend("cpu"); await tf.ready(); }
    detectorRef.current = await poseDetection.createDetector(poseDetection.SupportedModels.BlazePose, { runtime: "mediapipe", modelType: "lite", solutionPath: "https://cdn.jsdelivr.net/npm/@mediapipe/pose" } as any);
  }

  function cleanup() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null;
    if (detectorRef.current) { detectorRef.current.dispose(); detectorRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    processingRef.current = false;
  }

  function analyzeAndCount(keypoints: KP[]) {
    const now = performance.now();
    lastPoseSnapshotRef.current = keypoints;
    const pickSide = (left: [string, string, string], right: [string, string, string], minScore = 0.4) => {
      const l0 = getKP(keypoints, left[0], minScore), l1 = getKP(keypoints, left[1], minScore), l2 = getKP(keypoints, left[2], minScore);
      const r0 = getKP(keypoints, right[0], minScore), r1 = getKP(keypoints, right[1], minScore), r2 = getKP(keypoints, right[2], minScore);
      const lC = Number(!!l0) + Number(!!l1) + Number(!!l2), rC = Number(!!r0) + Number(!!r1) + Number(!!r2);
      if (lC === 3) return { a: l0!, b: l1!, c: l2! }; if (rC === 3) return { a: r0!, b: r1!, c: r2! };
      if (lC >= rC && lC >= 2) return { a: l0!, b: l1!, c: l2! }; if (rC >= 2) return { a: r0!, b: r1!, c: r2! };
      return null;
    };
    const ls = getKP(keypoints, "left_shoulder", 0.35), rs = getKP(keypoints, "right_shoulder", 0.35);
    const lw = getKP(keypoints, "left_wrist", 0.35), rw = getKP(keypoints, "right_wrist", 0.35);
    const la = getKP(keypoints, "left_ankle", 0.35), ra = getKP(keypoints, "right_ankle", 0.35);
    const shoulderWidth = ls && rs ? Math.max(1, Math.abs(ls.x - rs.x)) : 220;
    const COOLDOWN_MS = 650;
    const tryCountRep = (repPose: boolean, resetPose: boolean) => {
      if (resetPose) repArmedRef.current = true;
      if (repPose && repArmedRef.current && now - lastRepTimeRef.current > COOLDOWN_MS) {
        repArmedRef.current = false; lastRepTimeRef.current = now;
        setRepCount((c) => c + 1); awardTeamPoints(pointsPerRep(selectedExercise)); return true;
      }
      return false;
    };
    if (selectedExercise === "squat") {
      const leg = pickSide(["left_hip", "left_knee", "left_ankle"], ["right_hip", "right_knee", "right_ankle"], 0.4);
      if (!leg) { setHint("Move back so hips/knees/ankles are visible."); setDebug(""); return; }
      const kneeAng = angleABC(leg.a, leg.b, leg.c);
      const counted = tryCountRep(kneeAng < 125, kneeAng > 165);
      setHint(counted ? "Rep counted — return to standing." : kneeAng < 125 ? "Nice depth — stand tall to reset." : "Stand tall, then squat down to count a rep.");
      setDebug(`kneeAngle=${Math.round(kneeAng)}°`); return;
    }
    if (selectedExercise === "pushup") {
      const arm = pickSide(["left_shoulder", "left_elbow", "left_wrist"], ["right_shoulder", "right_elbow", "right_wrist"], 0.4);
      if (!arm) { setHint("Show shoulders, elbows, and wrists."); setDebug(""); return; }
      const elbowAng = angleABC(arm.a, arm.b, arm.c);
      const counted = tryCountRep(elbowAng < 120, elbowAng > 170);
      setHint(counted ? "Rep counted — extend arms." : elbowAng < 120 ? "Good depth — press up." : "Lower down to count a rep.");
      setDebug(`elbowAngle=${Math.round(elbowAng)}°`); return;
    }
    if (selectedExercise === "jumping_jacks") {
      if (!ls || !rs || !lw || !rw || !la || !ra) { setHint("Show wrists, ankles, and shoulders."); setDebug(""); return; }
      const shouldersY = (ls.y + rs.y) / 2;
      const handsUp = lw.y < shouldersY - 30 && rw.y < shouldersY - 30;
      const ankleSpan = Math.abs(la.x - ra.x) / shoulderWidth;
      const counted = tryCountRep(handsUp && ankleSpan > 1.35, lw.y > shouldersY + 25 && rw.y > shouldersY + 25 && ankleSpan < 0.95);
      setHint(counted ? "Rep counted — return to center." : handsUp && ankleSpan > 1.35 ? "Nice — return to center." : "Open (hands up + feet out) to count.");
      setDebug(`ankleSpan=${ankleSpan.toFixed(2)} handsUp=${handsUp ? "Y" : "N"}`);
    }
  }

  async function loop() {
    const v = videoRef.current, c = canvasRef.current, detector = detectorRef.current;
    if (!v || !c || !detector) return;
    if (processingRef.current) { rafRef.current = requestAnimationFrame(loop); return; }
    processingRef.current = true;
    try {
      const ctx = c.getContext("2d"); if (!ctx) return;
      const w = v.videoWidth, h = v.videoHeight;
      if (w === 0 || h === 0) { rafRef.current = requestAnimationFrame(loop); return; }
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
      const poses = await detector.estimatePoses(v, { maxPoses: 1, flipHorizontal: true });
      ctx.clearRect(0, 0, w, h);
      const pose = poses[0];
      if (pose?.keypoints?.length) {
        ctx.save(); ctx.lineWidth = 3; ctx.strokeStyle = "rgba(255,255,255,.75)"; ctx.fillStyle = "rgba(255,176,32,.9)";
        for (const [aName, bName] of EDGES) { const a = getKP(pose.keypoints, aName, 0.35), b = getKP(pose.keypoints, bName, 0.35); if (a && b) drawLine(ctx, a, b); }
        for (const kp of pose.keypoints) if ((kp.score ?? 1) > 0.5) drawKeypoint(ctx, kp);
        ctx.restore();
        const now = performance.now();
        if (now - lastUiUpdateRef.current > 120) { lastUiUpdateRef.current = now; analyzeAndCount(pose.keypoints); }
      } else {
        const now = performance.now();
        if (now - lastUiUpdateRef.current > 200) { lastUiUpdateRef.current = now; setHint("No pose detected — step back."); setDebug(""); }
      }
    } catch (e) { console.error("TF loop error:", e); }
    finally { processingRef.current = false; rafRef.current = requestAnimationFrame(loop); }
  }

  async function start() {
    try {
      setStatus("loading"); setHint(""); setDebug(""); setRepCount(0);
      repArmedRef.current = true; lastRepTimeRef.current = 0; lastUiUpdateRef.current = 0;
      processingRef.current = false; hrSamplesRef.current = []; lastPoseSnapshotRef.current = null;
      sessionStartRef.current = Date.now();
      await setupCamera(); await setupDetector();
      setStatus("running"); rafRef.current = requestAnimationFrame(loop);
    } catch (e) { console.error(e); setStatus("error"); setHint("Could not start camera/model. Check permissions."); }
  }

  function stop() { cleanup(); setStatus("idle"); }

  useEffect(() => { return () => cleanup(); }, []);
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) { if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null; processingRef.current = false; }
      else if (status === "running" && !rafRef.current) rafRef.current = requestAnimationFrame(loop);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [status]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      try {
        const [sessionsRes, latestRes, metricsRes] = await Promise.all([
          fetch(`${API}/store/sessions/all`, { signal: controller.signal }),
          fetch(`${API}/store/latest`, { signal: controller.signal }),
          fetch(`${API}/store/workout/live`, { signal: controller.signal }),
        ]);
        if (sessionsRes.ok) setSessionData(await sessionsRes.json());
        if (latestRes.ok) setLatest(await latestRes.json());
        if (metricsRes.ok) { const data = await metricsRes.json(); setSessionData((prev: any) => ({ ...(prev ?? {}), workout_metrics: data.metrics ?? [] })); }
      } catch {}
    };
    fetchData(); const interval = setInterval(fetchData, 5000);
    return () => { controller.abort(); clearInterval(interval); };
  }, []);

  useEffect(() => { setRepCount(0); setHint(""); setDebug(""); repArmedRef.current = true; lastRepTimeRef.current = 0; }, [selectedExercise]);

  const workoutSessions = sessionData?.workout_sessions ?? [];
  const ecgSessions = sessionData?.ecg_sessions ?? [];
  const fmt = (val: number | null | undefined, decimals = 0) => val && val > 0 ? val.toFixed(decimals) : "--";
  const myPlayerState = coopPlayers.find((p) => p.player_id === myPlayerId);
  const partnerPlayers = coopPlayers.filter((p) => p.player_id !== myPlayerId);

  return (
    <div className="rr">
      {modalOpen && <FeedbackModal feedback={aiFeedback} loading={aiLoading} onClose={() => setModalOpen(false)} />}
      <header className="rr-nav">
        <div className="rr-nav__inner">
          <Link className="rr-brand" to="/" aria-label="RedlineRanch home">
            <span className="rr-brand__name">RedlineRanch</span>
            <span className="rr-brand__tag">ECG • Fitness • ML</span>
          </Link>
          <div />
          <div className="rr-nav__cta">
            <Link className="rr-btn rr-btn--ghost rr-btn--nav" to="/dashboard">Back</Link>
            <button className="rr-btn rr-btn--primary rr-btn--nav" type="button" onClick={() => navigate("/sessions")}>Sessions</button>
          </div>
        </div>
      </header>

      <main>
        <section className="rr-section">
          <div className="rr-section__inner">
            <h2 className="rr-h2">Session</h2>
            <p className="rr-lead">
              {mission?.missionTitle
                ? <> Mission: <span style={{ fontWeight: 950 }}>{mission.missionTitle}</span> — pick an exercise and start.</>
                : "Pick an exercise and start the camera."}
            </p>

            {/* ── Co-op panel ─────────────────────────────────────────────── */}
            {myTeam && (
              <div className="rr-feature" style={{ marginTop: 18 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <h3 style={{ margin: 0 }}>🤝 Co-op — {myTeam.name}</h3>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,.4)", fontWeight: 700 }}>
                    {partnerPlayers.length > 0 ? `${partnerPlayers.length} partner${partnerPlayers.length > 1 ? "s" : ""} connected` : "Waiting for teammates..."}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {myPlayerState && <PartnerCard p={myPlayerState} isMe />}
                  {partnerPlayers.map((p) => <PartnerCard key={p.player_id} p={p} />)}
                  {partnerPlayers.length === 0 && (
                    <div className="rr-mini" style={{ flex: "1 1 200px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 80, color: "rgba(255,255,255,.25)", fontWeight: 700, fontSize: 13 }}>
                      Have a teammate open this page on the same network
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Health Metrics ───────────────────────────────────────────── */}
            <div className="rr-feature" style={{ marginTop: 18 }}>
              <h3 style={{ marginTop: 0 }}>Health Metrics from Apple Watch</h3>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                {[
                  ["Heart Rate", `${fmt(latest?.heart_rate)}${latest?.heart_rate > 0 ? " bpm" : ""}`],
                  ["Resting HR", `${fmt(latest?.resting_heart_rate)}${latest?.resting_heart_rate > 0 ? " bpm" : ""}`],
                  ["HRV", `${fmt(latest?.hrv, 1)}${latest?.hrv > 0 ? " ms" : ""}`],
                  ["Oxygen Sat", latest?.oxygen_saturation > 0 ? `${(latest.oxygen_saturation * 100).toFixed(1)}%` : "--"],
                  ["HR Recovery", `${fmt(latest?.heart_rate_recovery)}${latest?.heart_rate_recovery > 0 ? " bpm" : ""}`],
                  ["AFib Burden", latest?.afib_burden > 0 ? `${(latest.afib_burden * 100).toFixed(1)}%` : "--"],
                  ["VO2 Max", `${fmt(latest?.vo2_max, 1)}${latest?.vo2_max > 0 ? " ml/kg·min" : ""}`],
                ].map(([k, v]) => (
                  <div key={k} className="rr-mini" style={{ flex: "1 1 140px" }}>
                    <div className="rr-mini__k">{k}</div>
                    <div className="rr-mini__v">{v}</div>
                  </div>
                ))}
              </div>
              <HeartRateGraph metrics={sessionData?.workout_metrics ?? []} />
              <div style={{ marginTop: 12, color: "rgba(255,255,255,.4)", fontWeight: 700, fontSize: 12 }}>
                {latest ? `Last updated: ${new Date(latest.timestamp * 1000).toLocaleString()}` : "Waiting for data from iPhone..."}
              </div>
            </div>

            {/* ── Exercise picker ──────────────────────────────────────────── */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 18 }}>
              <div className="rr-links">
                {exercises.map((ex) => (
                  <button key={ex.key} className="rr-btn rr-btn--ghost" type="button" onClick={() => setSelectedExercise(ex.key)}
                    style={{ background: selectedExercise === ex.key ? "rgba(255,255,255,.10)" : "rgba(255,255,255,.06)", borderColor: selectedExercise === ex.key ? "rgba(255,255,255,.22)" : "rgba(255,255,255,.14)" }}>
                    {ex.name}
                  </button>
                ))}
              </div>
              {status !== "running" ? (
                <button className="rr-btn rr-btn--primary" type="button" onClick={start}>
                  {status === "loading" ? "Starting..." : "Start Camera + BlazePose"}
                </button>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="rr-btn rr-btn--ghost" type="button" onClick={stop}>Stop</button>
                  <button className="rr-btn rr-btn--primary" type="button" onClick={endSession}
                    style={{ background: "rgba(232,0,61,.9)", borderColor: "rgba(232,0,61,.5)", boxShadow: "0 0 18px rgba(232,0,61,.3)" }}>
                    End Session
                  </button>
                </div>
              )}
            </div>
            <div style={{ marginTop: 14, color: "rgba(255,255,255,.72)", fontWeight: 800 }}>
              {exercises.find((e) => e.key === selectedExercise)?.description}
            </div>

            {/* ── Camera + feedback ────────────────────────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 14, marginTop: 18 }}>
              <div className="rr-feature">
                <h3 style={{ marginTop: 0 }}>Live Feedback</h3>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                  <div className="rr-mini" style={{ flex: "1 1 160px" }}>
                    <div className="rr-mini__k">Status</div>
                    <div className="rr-mini__v">{status === "idle" && "Idle"}{status === "loading" && "Loading"}{status === "running" && "Running"}{status === "error" && "Error"}</div>
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
                  Tip: Stand back so your full body is visible. Good lighting helps.
                </div>
              </div>
              <div className="rr-card rr-card--glass" style={{ maxWidth: "100%", position: "relative" }}>
                <div className="rr-card__top">
                  <div className="rr-pill">BlazePose</div>
                  <div className="rr-chip">{status === "running" ? "Live" : "Ready"}</div>
                </div>
                <div style={{ padding: 12, position: "relative" }}>
                  <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", borderRadius: 18, border: "1px solid rgba(255,255,255,.10)", background: "rgba(0,0,0,.35)", transform: "scaleX(-1)" }} />
                  <canvas ref={canvasRef} style={{ position: "absolute", inset: 12, width: "calc(100% - 24px)", height: "calc(100% - 24px)", pointerEvents: "none", borderRadius: 18 }} />
                </div>
                <div className="rr-card__bottom">
                  <div className="rr-note"><span className="rr-note__icon">📌</span><span>Demo-grade feedback (not medical).</span></div>
                </div>
              </div>
            </div>

            {/* ── Past Sessions ────────────────────────────────────────────── */}
            <div className="rr-feature" style={{ marginTop: 18 }}>
              <h3 style={{ marginTop: 0 }}>Past Sessions</h3>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                <div className="rr-mini" style={{ flex: "1 1 160px" }}><div className="rr-mini__k">Workout Sessions</div><div className="rr-mini__v">{workoutSessions.length}</div></div>
                <div className="rr-mini" style={{ flex: "1 1 160px" }}><div className="rr-mini__k">ECG Sessions</div><div className="rr-mini__v">{ecgSessions.length}</div></div>
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
                <div style={{ marginTop: 10, color: "rgba(255,255,255,.45)", fontWeight: 700 }}>No sessions yet — send data from your iPhone to see them here.</div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}