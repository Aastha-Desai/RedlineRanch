import * as poseDetection from "@tensorflow-models/pose-detection";

type KP = poseDetection.Keypoint;
type ExerciseKey = "squat" | "pushup" | "jumping_jacks";

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function getKP(keypoints: KP[], name: string, minScore = 0.4) {
  const kp = keypoints.find((k) => k.name === name);
  if (!kp) return null;
  if ((kp.score ?? 1) < minScore) return null;
  return kp;
}

function angleABC(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const magAB = Math.sqrt(ab.x * ab.x + ab.y * ab.y);
  const magCB = Math.sqrt(cb.x * cb.x + cb.y * cb.y);
  const cos = dot / (magAB * magCB + 1e-6);
  const ang = Math.acos(clamp(cos, -1, 1));
  return (ang * 180) / Math.PI;
}

export function computeFormScore(exercise: ExerciseKey, keypoints: KP[]) {
  // Score: 0..100
  if (exercise === "squat") {
    const hip = getKP(keypoints, "left_hip") ?? getKP(keypoints, "right_hip");
    const knee = getKP(keypoints, "left_knee") ?? getKP(keypoints, "right_knee");
    const ankle = getKP(keypoints, "left_ankle") ?? getKP(keypoints, "right_ankle");
    if (!hip || !knee || !ankle) return 0;

    const kneeAng = angleABC(hip, knee, ankle); // lower = deeper
    // Map 170..95 -> 40..100
    const depth = clamp(((170 - kneeAng) / (170 - 95)) * 60 + 40, 40, 100);
    return Math.round(depth);
  }

  if (exercise === "pushup") {
    const sh = getKP(keypoints, "left_shoulder") ?? getKP(keypoints, "right_shoulder");
    const el = getKP(keypoints, "left_elbow") ?? getKP(keypoints, "right_elbow");
    const wr = getKP(keypoints, "left_wrist") ?? getKP(keypoints, "right_wrist");
    if (!sh || !el || !wr) return 0;

    const elbowAng = angleABC(sh, el, wr); // lower = deeper
    // Map 175..80 -> 40..100
    const depth = clamp(((175 - elbowAng) / (175 - 80)) * 60 + 40, 40, 100);
    return Math.round(depth);
  }

  if (exercise === "jumping_jacks") {
    const ls = getKP(keypoints, "left_shoulder", 0.35);
    const rs = getKP(keypoints, "right_shoulder", 0.35);
    const lw = getKP(keypoints, "left_wrist", 0.35);
    const rw = getKP(keypoints, "right_wrist", 0.35);
    const la = getKP(keypoints, "left_ankle", 0.35);
    const ra = getKP(keypoints, "right_ankle", 0.35);
    if (!ls || !rs || !lw || !rw || !la || !ra) return 0;

    const shouldersY = (ls.y + rs.y) / 2;
    const shoulderWidth = Math.max(1, Math.abs(ls.x - rs.x));

    const handsUp = lw.y < shouldersY - 30 && rw.y < shouldersY - 30;
    const ankleSpan = Math.abs(la.x - ra.x) / shoulderWidth;
    const feetApart = ankleSpan > 1.35;

    // 100 if both, otherwise partial
    const score = (handsUp ? 55 : 25) + (feetApart ? 45 : 20);
    return Math.round(clamp(score, 0, 100));
  }

  return 0;
}

export function computePoints(formScore: number) {
  const base = 10;
  const mult = clamp(formScore / 100, 0.6, 1.3);
  return Math.round(base * mult);
}