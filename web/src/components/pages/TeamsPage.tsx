import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./landing.css";

type Team = {
  id: string;
  name: string;
  points: number;
  roomCode?: string;
};

const STORAGE_KEY = "rr_team";
const API = "http://192.168.1.190:5000";

export default function TeamsPage() {
  const navigate = useNavigate();

  const [team, setTeam] = useState<Team | null>(null);
  const [tab, setTab] = useState<"create" | "join">("create");

  // create form
  const [teamName, setTeamName] = useState("");
  const [creating, setCreating] = useState(false);

  // join form
  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  const [copied, setCopied] = useState(false);

  const leaderboard: Team[] = [
    { id: "1", name: "Canyon Crushers", points: 1240 },
    { id: "2", name: "Wild West Warriors", points: 980 },
    { id: "3", name: "Rhythm Riders", points: 870 },
  ];

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setTeam(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (team) localStorage.setItem(STORAGE_KEY, JSON.stringify(team));
  }, [team]);

  async function createTeam() {
    if (!teamName.trim()) { alert("Enter a team name."); return; }
    setCreating(true);
    try {
      const res = await fetch(`${API}/sync/create-room`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_name: teamName.trim() }),
      });
      const data = await res.json();
      setTeam({ id: data.team_id, name: teamName.trim(), points: 0, roomCode: data.room_code });
      setTeamName("");
    } catch {
      alert("Could not reach server. Make sure your backend is running.");
    } finally {
      setCreating(false);
    }
  }

  async function joinTeam() {
    setJoinError("");
    if (!joinCode.trim()) { setJoinError("Enter the room code."); return; }
    if (!joinName.trim()) { setJoinError("Enter your name so teammates can see you."); return; }
    setJoining(true);
    try {
      const res = await fetch(`${API}/sync/join-room`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_code: joinCode.trim().toUpperCase(), player_name: joinName.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        setJoinError(err.detail ?? "Invalid room code.");
        return;
      }
      const data = await res.json();
      setTeam({ id: data.team_id, name: joinName.trim(), points: 0, roomCode: data.room_code });
      setJoinCode("");
      setJoinName("");
    } catch {
      setJoinError("Could not reach server. Make sure your backend is running.");
    } finally {
      setJoining(false);
    }
  }

  function leaveTeam() {
    localStorage.removeItem(STORAGE_KEY);
    setTeam(null);
  }

  function copyCode() {
    if (!team?.roomCode) return;
    navigator.clipboard.writeText(team.roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const combinedLeaderboard = team
    ? [...leaderboard, { ...team }].sort((a, b) => b.points - a.points)
    : leaderboard;

  return (
    <div className="rr">
      <header className="rr-nav">
        <div className="rr-nav__inner">
          <Link className="rr-brand" to="/">
            <span className="rr-brand__name">RedlineRanch</span>
            <span className="rr-brand__tag">ECG • Fitness • ML</span>
          </Link>
          <div />
          <div className="rr-nav__cta">
            <Link className="rr-btn rr-btn--ghost rr-btn--nav" to="/dashboard">Back</Link>
            <Link className="rr-btn rr-btn--ghost rr-btn--nav" to="/sessions">Sessions</Link>
            <button className="rr-btn rr-btn--ghost rr-btn--nav" onClick={() => navigate("/")}>Log out</button>
          </div>
        </div>
      </header>

      <main>
        <section className="rr-section">
          <div className="rr-section__inner">
            <h2 className="rr-h2">Teams</h2>
            <p className="rr-lead">Earn points from BlazePose-detected reps and climb the leaderboard.</p>

            {/* ── No team yet ─────────────────────────────────────────────── */}
            {!team && (
              <div className="rr-feature">
                {/* Tab switcher */}
                <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                  {(["create", "join"] as const).map((t) => (
                    <button
                      key={t}
                      className="rr-btn rr-btn--ghost"
                      type="button"
                      onClick={() => setTab(t)}
                      style={{
                        background: tab === t ? "rgba(232,0,61,.15)" : "rgba(255,255,255,.06)",
                        borderColor: tab === t ? "rgba(232,0,61,.5)" : "rgba(255,255,255,.14)",
                        color: tab === t ? "#fff" : "rgba(255,255,255,.5)",
                        fontWeight: 800,
                      }}
                    >
                      {t === "create" ? "Create Team" : "Join Team"}
                    </button>
                  ))}
                </div>

                {tab === "create" && (
                  <div>
                    <p style={{ color: "rgba(255,255,255,.5)", fontWeight: 700, fontSize: 13, marginTop: 0 }}>
                      Create a team and share the code with your partner.
                    </p>
                    <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                      <input
                        className="rr-input"
                        placeholder="Team name"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && createTeam()}
                        style={{ maxWidth: 280 }}
                      />
                      <button className="rr-btn rr-btn--primary" onClick={createTeam} disabled={creating}>
                        {creating ? "Creating..." : "Create"}
                      </button>
                    </div>
                  </div>
                )}

                {tab === "join" && (
                  <div>
                    <p style={{ color: "rgba(255,255,255,.5)", fontWeight: 700, fontSize: 13, marginTop: 0 }}>
                      Enter the code your teammate shared with you.
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 280 }}>
                      <input
                        className="rr-input"
                        placeholder="Room code  (e.g. RR-4X9K)"
                        value={joinCode}
                        onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError(""); }}
                        style={{ letterSpacing: 2, fontWeight: 800 }}
                      />
                      <input
                        className="rr-input"
                        placeholder="Your name"
                        value={joinName}
                        onChange={(e) => setJoinName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && joinTeam()}
                      />
                      {joinError && (
                        <div style={{ color: "#e8003d", fontWeight: 700, fontSize: 13 }}>{joinError}</div>
                      )}
                      <button className="rr-btn rr-btn--primary" onClick={joinTeam} disabled={joining} style={{ alignSelf: "flex-start" }}>
                        {joining ? "Joining..." : "Join"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── In a team ────────────────────────────────────────────────── */}
            {team && (
              <div className="rr-card rr-card--glass" style={{ marginBottom: 20 }}>
                <div className="rr-card__top">
                  <div className="rr-pill">Your Team</div>
                  <button
                    className="rr-btn rr-btn--ghost"
                    style={{ fontSize: 12, padding: "4px 12px" }}
                    onClick={leaveTeam}
                  >
                    Leave
                  </button>
                </div>
                <div style={{ padding: "12px 16px 20px" }}>
                  <h3 style={{ marginTop: 0, marginBottom: 4 }}>{team.name}</h3>
                  <p style={{ fontWeight: 800, fontSize: 22, margin: "0 0 16px" }}>{team.points} pts</p>

                  {/* Room code display */}
                  {team.roomCode && (
                    <div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>
                        ROOM CODE — share this with your partner
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{
                          background: "rgba(232,0,61,.1)",
                          border: "1px solid rgba(232,0,61,.3)",
                          borderRadius: 12,
                          padding: "10px 20px",
                          fontFamily: "monospace",
                          fontSize: 28,
                          fontWeight: 900,
                          letterSpacing: 4,
                          color: "#fff",
                        }}>
                          {team.roomCode}
                        </div>
                        <button
                          className="rr-btn rr-btn--ghost"
                          onClick={copyCode}
                          style={{ fontSize: 13 }}
                        >
                          {copied ? "✓ Copied!" : "Copy"}
                        </button>
                      </div>
                      <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,.35)", fontWeight: 700 }}>
                        Partner goes to Teams → Join Team → enters this code
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Leaderboard ──────────────────────────────────────────────── */}
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
                      alignItems: "center",
                      padding: 12,
                      border: team && t.id === team.id ? "2px solid rgba(232,0,61,.5)" : "1px solid rgba(255,255,255,.1)",
                      background: team && t.id === team.id ? "rgba(232,0,61,.06)" : undefined,
                    }}
                  >
                    <div style={{ fontWeight: 800 }}>
                      <span style={{ color: index === 0 ? "gold" : index === 1 ? "silver" : index === 2 ? "#cd7f32" : "rgba(255,255,255,.5)", marginRight: 10 }}>
                        #{index + 1}
                      </span>
                      {t.name}
                      {team && t.id === team.id && <span style={{ marginLeft: 8, fontSize: 11, color: "rgba(232,0,61,.8)", fontWeight: 900 }}>YOU</span>}
                    </div>
                    <div style={{ fontWeight: 900, fontSize: 16 }}>{t.points} <span style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>pts</span></div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 15, fontWeight: 700, opacity: 0.5, fontSize: 13 }}>
                Start sessions to earn points and move up the board.
              </div>
            </div>

          </div>
        </section>
      </main>
    </div>
  );
}