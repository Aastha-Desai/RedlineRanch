import { Link, useNavigate } from "react-router-dom";
import "./landing.css";

type Mission = {
  id: string;
  theme: string;
  title: string;
  duration: string;
  subtitle: string;
  tags: string[];
  difficulty: "Easy" | "Medium" | "Hard";
  icon: string;
};

export default function DashboardPage() {
  const navigate = useNavigate();

  const themed: Mission[] = [
    {
      id: "wildwest-saddle-sprint",
      theme: "Wild West",
      title: "Saddle Sprint",
      duration: "10 min",
      subtitle: "Quick cardio + recovery check",
      tags: ["Cardio", "Streak", "Beginner"],
      difficulty: "Easy",
      icon: "🤠",
    },
    {
      id: "wildwest-canyon-climb",
      theme: "Wild West",
      title: "Canyon Climb",
      duration: "20 min",
      subtitle: "Intervals + rhythm stability",
      tags: ["Intervals", "Weekly", "Team"],
      difficulty: "Medium",
      icon: "⛰️",
    },
    {
      id: "wildwest-saloon-stretch",
      theme: "Wild West",
      title: "Saloon Stretch",
      duration: "12 min",
      subtitle: "Mobility + HRV reset",
      tags: ["Mobility", "HRV", "Group"],
      difficulty: "Easy",
      icon: "🧘",
    },
  ];

  const standard: Mission[] = [
    {
      id: "steady-state",
      theme: "Everyday",
      title: "Steady State",
      duration: "25 min",
      subtitle: "Zone 2 ride + trend check",
      tags: ["Endurance", "Low stress", "Baseline"],
      difficulty: "Easy",
      icon: "🚴",
    },
    {
      id: "threshold-builder",
      theme: "Performance",
      title: "Threshold Builder",
      duration: "30 min",
      subtitle: "Sustained effort + rhythm watch",
      tags: ["Power", "Focus", "Progress"],
      difficulty: "Hard",
      icon: "⚡",
    },
    {
      id: "recovery-reset",
      theme: "Recovery",
      title: "Recovery Reset",
      duration: "15 min",
      subtitle: "Easy spin + HRV boost",
      tags: ["Recovery", "Breathing", "Easy"],
      difficulty: "Easy",
      icon: "🌿",
    },
  ];

  function onSelectMission(m: Mission) {
    navigate("/session", { state: { missionId: m.id, missionTitle: m.title } });
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
            <Link className="rr-btn rr-btn--ghost rr-btn--nav" to="/ecg">
              ECG Collection
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
              Choose a mission to begin. You'll jump into a session with TensorFlow rhythm flags + live heart metrics.
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
                      <span key={t} className="rr-pill">{t}</span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                    <button className="rr-btn rr-btn--primary" type="button" onClick={() => onSelectMission(m)}>
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
                      <span key={t} className="rr-pill">{t}</span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                    <button className="rr-btn rr-btn--primary" type="button" onClick={() => onSelectMission(m)}>
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