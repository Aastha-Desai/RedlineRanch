type Member = { id: string; name: string; points: number };
type Team = { id: string; name: string; code: string; points: number; members: Member[] };

const TEAM_KEY = "rr_team_active";
const USER_KEY = "rr_user";
const TEAMS_DB_KEY = "rr_teams_db";

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function makeCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (raw) return JSON.parse(raw) as { id: string; name: string; points: number };
  const u = { id: uid(), name: "Rider", points: 0 };
  localStorage.setItem(USER_KEY, JSON.stringify(u));
  return u;
}

export function setUserName(name: string) {
  const u = getUser();
  const next = { ...u, name: name.trim() || "Rider" };
  localStorage.setItem(USER_KEY, JSON.stringify(next));
  return next;
}

function loadTeams(): Team[] {
  const raw = localStorage.getItem(TEAMS_DB_KEY);
  return raw ? (JSON.parse(raw) as Team[]) : [];
}

function saveTeams(teams: Team[]) {
  localStorage.setItem(TEAMS_DB_KEY, JSON.stringify(teams));
}

export function getActiveTeam(): Team | null {
  const id = localStorage.getItem(TEAM_KEY);
  if (!id) return null;
  const teams = loadTeams();
  return teams.find((t) => t.id === id) ?? null;
}

export function leaveTeam() {
  localStorage.removeItem(TEAM_KEY);
}

export function createTeam(teamName: string) {
  const teams = loadTeams();
  const user = getUser();

  const team: Team = {
    id: uid(),
    name: teamName.trim() || "My Posse",
    code: makeCode(),
    points: 0,
    members: [{ id: user.id, name: user.name, points: 0 }],
  };

  teams.push(team);
  saveTeams(teams);
  localStorage.setItem(TEAM_KEY, team.id);
  return team;
}

export function joinTeamByCode(code: string) {
  const teams = loadTeams();
  const user = getUser();
  const team = teams.find((t) => t.code === code.trim().toUpperCase());
  if (!team) return { ok: false as const, message: "Team code not found." };

  const exists = team.members.some((m) => m.id === user.id);
  if (!exists) team.members.push({ id: user.id, name: user.name, points: 0 });

  saveTeams(teams);
  localStorage.setItem(TEAM_KEY, team.id);
  return { ok: true as const, team };
}

export function awardPoints(points: number) {
  const p = Math.max(0, Math.round(points));
  if (!p) return;

  // user points
  const user = getUser();
  const nextUser = { ...user, points: user.points + p };
  localStorage.setItem(USER_KEY, JSON.stringify(nextUser));

  // team points
  const team = getActiveTeam();
  if (!team) return;

  const teams = loadTeams();
  const t = teams.find((x) => x.id === team.id);
  if (!t) return;

  t.points += p;

  const member = t.members.find((m) => m.id === nextUser.id);
  if (member) member.points += p;
  else t.members.push({ id: nextUser.id, name: nextUser.name, points: p });

  saveTeams(teams);
}

export function getLeaderboard() {
  const team = getActiveTeam();
  if (!team) return [];
  return [...team.members].sort((a, b) => b.points - a.points);
}