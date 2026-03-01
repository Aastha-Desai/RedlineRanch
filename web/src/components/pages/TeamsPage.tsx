<<<<<<< HEAD
export default function TeamsPage() {
  return (
    <div className="teams-page">
      <h1>Teams Page</h1>
      <p>This is the Teams page content.</p>
=======
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./landing.css";

type Team = {
  id: string;
  name: string;
  points: number;
};

const STORAGE_KEY = "rr_team";

export default function TeamsPage() {
  const navigate = useNavigate();

  const [teamName, setTeamName] = useState("");
  const [team, setTeam] = useState<Team | null>(null);

  // Fake leaderboard data
  const [leaderboard, setLeaderboard] = useState<Team[]>([
    { id: "1", name: "Canyon Crushers", points: 1240 },
    { id: "2", name: "Wild West Warriors", points: 980 },
    { id: "3", name: "Rhythm Riders", points: 870 },
  ]);

  // Load saved team
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      setTeam(parsed);
    }
  }, []);

  // Save team
  useEffect(() => {
    if (team) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(team));
    }
  }, [team]);

  function createTeam() {
    if (!teamName.trim()) {
      alert("Enter a team name.");
      return;
    }

    const newTeam: Team = {
      id: Date.now().toString(),
      name: teamName,
      points: 0,
    };

    setTeam(newTeam);
    setTeamName("");
  }

  function logout() {
    navigate("/");
  }

  // Combine fake leaderboard + your real team
  const combinedLeaderboard = team
    ? [...leaderboard, team].sort((a, b) => b.points - a.points)
    : leaderboard;

  return (
    <div className="rr">
      {/* Navbar */}
      <header className="rr-nav">
        <div className="rr-nav__inner">
          <Link className="rr-brand" to="/">
            <span className="rr-brand__name">RedlineRanch</span>
            <span className="rr-brand__tag">ECG • Fitness • ML</span>
          </Link>

          <div />

          <div className="rr-nav__cta">
            <Link className="rr-btn rr-btn--ghost rr-btn--nav" to="/dashboard">
              Back
            </Link>

            <Link className="rr-btn rr-btn--ghost rr-btn--nav" to="/sessions">
              Sessions
            </Link>

            <button
              className="rr-btn rr-btn--ghost rr-btn--nav"
              onClick={logout}
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="rr-section">
          <div className="rr-section__inner">
            <h2 className="rr-h2">Teams</h2>
            <p className="rr-lead">
              Earn points from BlazePose-detected reps and climb the leaderboard.
            </p>

            {/* Create Team */}
            {!team && (
              <div className="rr-feature">
                <h3>Create a Team</h3>

                <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                  <input
                    className="rr-input"
                    placeholder="Team name"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    style={{ maxWidth: 300 }}
                  />
                  <button
                    className="rr-btn rr-btn--primary"
                    onClick={createTeam}
                  >
                    Create
                  </button>
                </div>
              </div>
            )}

            {/* Your Team */}
            {team && (
              <div className="rr-card rr-card--glass" style={{ marginBottom: 20 }}>
                <div className="rr-card__top">
                  <div className="rr-pill">Your Team</div>
                </div>

                <div style={{ padding: 16 }}>
                  <h3 style={{ marginTop: 0 }}>{team.name}</h3>
                  <p style={{ fontWeight: 800, fontSize: 22 }}>
                    {team.points} points
                  </p>
                </div>
              </div>
            )}

            {/* Leaderboard */}
            <div className="rr-feature">
              <h3>Leaderboard</h3>

              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                {combinedLeaderboard.map((t, index) => (
                  <div
                    key={t.id}
                    className="rr-mini"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: 12,
                      border:
                        team && t.id === team.id
                          ? "2px solid gold"
                          : "1px solid rgba(255,255,255,.1)",
                    }}
                  >
                    <div>
                      #{index + 1} {t.name}
                    </div>
                    <div style={{ fontWeight: 800 }}>{t.points}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 15, fontWeight: 700, opacity: 0.6 }}>
                Start sessions to earn points and move up the board.
              </div>
            </div>
          </div>
        </section>
      </main>
>>>>>>> refs/remotes/origin/main
    </div>
  );
}