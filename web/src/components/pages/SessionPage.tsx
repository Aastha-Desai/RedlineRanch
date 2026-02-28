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

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function angleABC(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number }
) {
  // angle at B between BA and BC
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
  // torso
  ["left_shoulder", "right_shoulder"],
  ["left_hip", "right_hip"],
  ["left_shoulder", "left_hip"],
  ["right_shoulder", "right_hip"],
  // left arm
  ["left_shoulder", "left_elbow"],
  ["left_elbow", "left_wrist"],
  // right arm
  ["right_shoulder", "right_elbow"],
  ["right_elbow", "right_wrist"],
  // left leg
  ["left_hip", "left_knee"],
  ["left_knee", "left_ankle"],
  // right leg
  ["right_hip", "right_knee"],
  ["right_knee", "right_ankle"],
];

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
  const [status, setStatus] = useState<"idle" | "loading" | "running" | "error">(
    "idle"
  );
  const [repCount, setRepCount] = useState(0);
  const [hint, setHint] = useState<string>("");
  const [debug, setDebug] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const detectorRef = useRef<poseDetection.PoseDetector | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // rep state
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
      if (lCount >= rCount && lCount >= 2)
        return { a: l0!, b: l1!, c: l2!, side: "left" as const };
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

      if (
        repPose &&
        repArmedRef.current &&
        now - lastRepTimeRef.current > COOLDOWN_MS
      ) {
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

      if (!leg) {
        setHint("Move back so hips/knees/ankles are visible.");
        setDebug("");
        return;
      }

      const kneeAng = angleABC(leg.a, leg.b, leg.c);
      const DOWN = 125;
      const UP = 165;

      const repPose = kneeAng < DOWN;
      const resetPose = kneeAng > UP;

      const counted = tryCountRep(repPose, resetPose);

      localHint = counted
        ? "Rep counted — return to standing to arm the next rep."
        : repPose
        ? "Nice depth — now stand tall to reset."
        : "Stand tall, then squat down to count a rep.";

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

      if (!arm) {
        setHint("Show shoulders, elbows, and wrists for push-up tracking.");
        setDebug("");
        return;
      }

      const elbowAng = angleABC(arm.a, arm.b, arm.c);
      const DOWN = 120;
      const UP = 170;

      const repPose = elbowAng < DOWN;
      const resetPose = elbowAng > UP;

      const counted = tryCountRep(repPose, resetPose);

      localHint = counted
        ? "Rep counted — extend arms to arm the next rep."
        : repPose
        ? "Good depth — press up to reset."
        : "Lower down (bend elbows) to count a rep.";

      setHint(localHint);
      setDebug(`elbowAngle=${Math.round(elbowAng)}°`);
      return;
    }

    if (selectedExercise === "jumping_jacks") {
      if (!ls || !rs || !lw || !rw || !la || !ra) {
        setHint("Show wrists, ankles, and shoulders for jumping jack tracking.");
        setDebug("");
        return;
      }

      const shouldersY = (ls.y + rs.y) / 2;

      const handsUp = lw.y < shouldersY - 30 && rw.y < shouldersY - 30;

      const ankleSpan = Math.abs(la.x - ra.x) / shoulderWidth;
      const feetApart = ankleSpan > 1.35;

      const handsDown = lw.y > shouldersY + 25 && rw.y > shouldersY + 25;
      const feetTogether = ankleSpan < 0.95;

      const repPose = handsUp && feetApart;
      const resetPose = handsDown && feetTogether;

      const counted = tryCountRep(repPose, resetPose);

      localHint = counted
        ? "Rep counted — return to center (hands down + feet together)."
        : repPose
        ? "Nice — now return to center to arm the next rep."
        : "Open (hands up + feet out) to count a rep.";

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

    if (w === 0 || h === 0) {
      rafRef.current = requestAnimationFrame(loop);
      return;
    }

    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }

    const poses = await detector.estimatePoses(v, {
      maxPoses: 1,
      flipHorizontal: true,
    });

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
    setRepCount(0);
    setHint("");
    setDebug("");
    repArmedRef.current = true;
    lastRepTimeRef.current = 0;
  }, [selectedExercise]);

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
            <Link className="rr-btn rr-btn--ghost rr-btn--nav" to="/dashboard">
              Back
            </Link>
            <button
              className="rr-btn rr-btn--primary rr-btn--nav"
              type="button"
              onClick={() => navigate("/sessions")}
            >
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
                <>
                  Mission:{" "}
                  <span style={{ fontWeight: 950 }}>{mission.missionTitle}</span>{" "}
                  — pick an exercise and start the camera.
                </>
              ) : (
                "Pick an exercise and start the camera."
              )}
            </p>

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                alignItems: "center",
                marginTop: 10,
              }}
            >
              <div className="rr-links" style={{ justifySelf: "start" }}>
                {exercises.map((ex) => (
                  <button
                    key={ex.key}
                    className="rr-btn rr-btn--ghost"
                    type="button"
                    onClick={() => setSelectedExercise(ex.key)}
                    style={{
                      background:
                        selectedExercise === ex.key
                          ? "rgba(255,255,255,.10)"
                          : "rgba(255,255,255,.06)",
                      borderColor:
                        selectedExercise === ex.key
                          ? "rgba(255,255,255,.22)"
                          : "rgba(255,255,255,.14)",
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
                <button className="rr-btn rr-btn--ghost" type="button" onClick={stop}>
                  Stop
                </button>
              )}
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={{ color: "rgba(255,255,255,.72)", fontWeight: 800 }}>
                {exercises.find((e) => e.key === selectedExercise)?.description}
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1.2fr",
                gap: 14,
                marginTop: 18,
              }}
            >
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

                <div style={{ marginTop: 10, color: "rgba(255,255,255,.55)", fontWeight: 700 }}>
                  {debug}
                </div>

                <div style={{ marginTop: 12 }} className="rr-note">
                  <span className="rr-note__icon">🧠</span>
                  <span>{hint || "Start the camera to get feedback."}</span>
                </div>

                <div
                  style={{
                    marginTop: 12,
                    color: "rgba(255,255,255,.6)",
                    fontWeight: 700,
                    lineHeight: 1.5,
                  }}
                >
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
                    <span>
                      This is demo-grade feedback (not medical). Next step: tighten thresholds per mission + add “form score”.
                    </span>
                  </div>
                </div>
              </div>
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