import { Link, useNavigate } from "react-router-dom";
import "./landing.css";

type ExerciseKey = "squat" | "pushup" | "jumping_jacks";
type GoalType = "reps" | "time";

type Mission = {
  id: string;
  theme: string;
  title: string;
  duration: string; // display text
  subtitle: string;
  tags: string[];
  difficulty: "Easy" | "Medium" | "Hard";
  icon: string;

  // ✅ NEW: mission goal config
  goalType: GoalType;
  goalReps?: number; // used if goalType === "reps"
  goalSeconds?: number; // used if goalType === "time"
  defaultExercise: ExerciseKey;
};

export default function DashboardPage() {
  const navigate = useNavigate();

  // ✅ Demo missions (some timed, some rep-based)
  const themed: Mission[] = [
    {
      id: "wildwest-saddle-sprint",
      theme: "Wild West",
      title: "Saddle Sprint",
      duration: "45 sec",
      subtitle: "Timed cardio burst (count reps for points)",
      tags: ["Cardio", "Timed", "Beginner"],
      difficulty: "Easy",
      icon: "🤠",
      goalType: "time",
      goalSeconds: 45,
      defaultExercise: "jumping_jacks",
    },
    {
      id: "wildwest-canyon-climb",
      theme: "Wild West",
      title: "Canyon Climb",
      duration: "60 sec",
      subtitle: "Timed strength sprint (squats)",
      tags: ["Timed", "Legs", "Team"],
      difficulty: "Medium",
      icon: "⛰️",
      goalType: "time",
      goalSeconds: 60,
      defaultExercise: "squat",
    },
    {
      id: "wildwest-saloon-stretch",
      theme: "Wild West",
      title: "Saloon Stretch",
      duration: "20 reps",
      subtitle: "Form-first push-ups (rep goal)",
      tags: ["Reps", "Form", "Easy"],
      difficulty: "Easy",
      icon: "🧘",
      goalType: "reps",
      goalReps: 20,
      defaultExercise: "pushup",
    },
  ];

  const standard: Mission[] = [
    {
      id: "steady-state",
      theme: "Everyday",
      title: "Steady State",
      duration: "25 reps",
      subtitle: "Controlled squats (rep goal)",
      tags: ["Reps", "Baseline", "Easy"],
      difficulty: "Easy",
      icon: "🚴",
      goalType: "reps",
      goalReps: 25,
      defaultExercise: "squat",
    },
    {
      id: "threshold-builder",
      theme: "Performance",
      title: "Threshold Builder",
      duration: "90 sec",
      subtitle: "Timed push-up challenge",
      tags: ["Timed", "Power", "Hard"],
      difficulty: "Hard",
      icon: "⚡",
      goalType: "time",
      goalSeconds: 90,
      defaultExercise: "pushup",
    },
    {
      id: "recovery-reset",
      theme: "Recovery",
      title: "Recovery Reset",
      duration: "30 reps",
      subtitle: "Light jumping jacks (rep goal)",
      tags: ["Reps", "Recovery", "Easy"],
      difficulty: "Easy",
      icon: "🌿",
      goalType: "reps",
      goalReps: 30,
      defaultExercise: "jumping_jacks",
    },
  ];

  function onSelectMission(m: Mission) {
    navigate("/session", {
      state: {
        missionId: m.id,
        missionTitle: m.title,
        goalType: m.goalType,
        goalReps: m.goalReps,
        goalSeconds: m.goalSeconds,
        defaultExercise: m.defaultExercise,
      },
    });
  }

  function onLogout() {
    navigate("/");
  }

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
            <Link className="rr-btn rr-btn--ghost rr-btn--nav" to="/sessions">
              Sessions
            </Link>
            <Link className="rr-btn rr-btn--ghost rr-btn--nav" to="/teams">
              Teams
            </Link>

            <button
              className="rr-btn rr-btn--ghost rr-btn--nav"
              type="button"
              onClick={onLogout}
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="rr-section">
          <div className="rr-section__inner">
            <h2 className="rr-h2">Challenge Board</h2>
            <p className="rr-lead">
              Choose a mission to begin. Some missions are timed, others have a rep goal.
              TensorFlow counts reps automatically.
            </p>
          </div>
        </section>

        <section className="rr-section rr-section--alt">
          <div className="rr-section__inner">
            <h2 className="rr-h2">Themed Missions</h2>

            <div className="rr-featureGrid">
              {themed.map((m) => (
                <div key={m.id} className="rr-feature">
                  <div className="rr-feature__icon">{m.icon}</div>

                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 950 }}>{m.theme}</div>
                    <span className="rr-pill">{m.difficulty}</span>
                  </div>

                  <h3 style={{ marginTop: 10, marginBottom: 6 }}>{m.title}</h3>

                  <p style={{ margin: 0, color: "rgba(255,255,255,.72)", fontWeight: 700 }}>
                    {m.duration} • {m.subtitle}
                  </p>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                    {m.tags.map((t) => (
                      <span key={t} className="rr-pill">
                        {t}
                      </span>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                    <button
                      className="rr-btn rr-btn--primary"
                      type="button"
                      onClick={() => onSelectMission(m)}
                    >
                      Select
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rr-section">
          <div className="rr-section__inner">
            <h2 className="rr-h2">Standard Categories</h2>
            <p className="rr-lead">Classic training + wellness missions that work any day.</p>

            <div className="rr-featureGrid">
              {standard.map((m) => (
                <div key={m.id} className="rr-feature">
                  <div className="rr-feature__icon">{m.icon}</div>

                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 950 }}>{m.theme}</div>
                    <span className="rr-pill">{m.difficulty}</span>
                  </div>

                  <h3 style={{ marginTop: 10, marginBottom: 6 }}>{m.title}</h3>

                  <p style={{ margin: 0, color: "rgba(255,255,255,.72)", fontWeight: 700 }}>
                    {m.duration} • {m.subtitle}
                  </p>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                    {m.tags.map((t) => (
                      <span key={t} className="rr-pill">
                        {t}
                      </span>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                    <button
                      className="rr-btn rr-btn--primary"
                      type="button"
                      onClick={() => onSelectMission(m)}
                    >
                      Select
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}