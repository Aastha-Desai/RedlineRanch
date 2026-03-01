import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./landing.css";
import heartlyLogo from "../../assets/heartly.png";

const API = "http://localhost:5000";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  loading?: boolean;
};

type ECGSession = {
  session_id: string;
  start_time: number;
  end_time: number;
  average_heart_rate: number | null;
  classification: string | null;
  symptom_status: string | null;
  sampling_frequency: number | null;
  number_of_measurements: number | null;
  device_name: string | null;
};

type ECGSample = { t: number; v: number };

function downsample(samples: ECGSample[], targetCount: number): number[] {
  if (samples.length === 0) return [];
  const step = Math.max(1, Math.floor(samples.length / targetCount));
  return samples.filter((_, i) => i % step === 0).slice(0, targetCount).map((s) => Math.round(s.v));
}

function buildECGContext(ecg: ECGSession | null, voltages: number[]): string {
  if (!ecg) return "No ECG data is available yet.";
  const date = new Date(ecg.start_time * 1000).toLocaleString();
  const voltageStr = voltages.length > 0
    ? `ECG voltage data (downsampled to ${voltages.length} points from ~${ecg.number_of_measurements ?? "unknown"} raw samples, in microvolts): [${voltages.join(", ")}]`
    : "No voltage data available.";
  return `The user's most recent ECG recording from their Apple Watch:
- Recorded: ${date}
- Classification: ${ecg.classification ?? "not available"}
- Avg heart rate: ${ecg.average_heart_rate ? `${ecg.average_heart_rate.toFixed(0)} bpm` : "not available"}
- ${voltageStr}

You are Heartly, a knowledgeable and encouraging heart health assistant for RedlineRanch. Analyze the voltage data to describe the waveform pattern if available — look for P waves, QRS complexes, T waves, and rhythm regularity. Help the user understand their ECG results. Always remind the user you are not a doctor and they should consult a cardiologist or GP for medical concerns. Keep responses concise, friendly, and fun.`;
}

export default function ChatPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Howdy! I'm Heartly 🤠 — your heart health sidekick. I've got your latest ECG loaded up. Ask me what it means, whether your rhythm looks good, or anything else on your mind!",
    },
  ]);
  const [input, setInput] = useState("");
  const [ecg, setEcg] = useState<ECGSession | null>(null);
  const [ecgLoading, setEcgLoading] = useState(true);
  const [voltages, setVoltages] = useState<number[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch latest ECG session + downsample its voltages
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/ecg/sessions`);
        if (res.ok) {
          const data = await res.json();
          const sessions = data.sessions ?? data;
          if (Array.isArray(sessions) && sessions.length > 0) {
            const latest = sessions[0];
            setEcg(latest);
            // Fetch raw samples and downsample to 300 points
            try {
              const sampRes = await fetch(`${API}/ecg/${latest.session_id}`);
              if (sampRes.ok) {
                const sampData = await sampRes.json();
                const raw: ECGSample[] = sampData.samples ?? [];
                setVoltages(downsample(raw, 300));
              }
            } catch {}
          }
        }
      } catch (e) {
        console.error("[Chat] Failed to fetch ECG:", e);
      } finally { setEcgLoading(false); }
    };
    load();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text) return;
    setInput("");

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", text };
    const loadingMsg: Message = { id: crypto.randomUUID(), role: "assistant", text: "", loading: true };
    setMessages((prev) => [...prev, userMsg, loadingMsg]);

    const context = buildECGContext(ecg, voltages);
    const fullMessage = `${context}\n\nUser question: ${text}`;

    try {
      const res = await fetch(`${API}/gemini/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: fullMessage }),
      });
      const data = await res.json();
      const reply = data.reply ?? data.response ?? data.message ?? data.text ?? "Sorry, I couldn't get a response.";
      setMessages((prev) => prev.map((m) => m.id === loadingMsg.id ? { ...m, text: reply, loading: false } : m));
    } catch {
      setMessages((prev) => prev.map((m) => m.id === loadingMsg.id
        ? { ...m, text: "Could not reach the AI. Make sure your backend is running.", loading: false }
        : m
      ));
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  const classificationColor = (c: string | null) => {
    if (!c) return "rgba(255,255,255,.4)";
    if (c.toLowerCase().includes("sinus")) return "rgba(0,220,110,.9)";
    if (c.toLowerCase().includes("fibrillation")) return "rgba(232,0,61,.9)";
    return "rgba(255,176,32,.9)";
  };

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
            <button className="rr-btn rr-btn--primary rr-btn--nav" type="button" onClick={() => navigate("/sessions")}>Sessions</button>
          </div>
        </div>
      </header>

      <main>
        <section className="rr-section">
          <div className="rr-section__inner">
            <h2 className="rr-h2">Heartly 🤠</h2>
            <p className="rr-lead">Your personal heart health sidekick — ask anything about your ECG.</p>

            {/* ECG context card */}
            <div className="rr-feature" style={{ marginTop: 18 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <h3 style={{ margin: 0, fontSize: 14 }}>Latest ECG</h3>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: ecg ? "#00dc6e" : "rgba(255,255,255,.2)", boxShadow: ecg ? "0 0 6px #00dc6e" : "none" }} />
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,.4)", fontWeight: 700 }}>
                    {ecgLoading ? "Loading..." : ecg ? "Loaded" : "No ECG data yet"}
                  </span>
                </div>
              </div>

              {ecgLoading ? (
                <div style={{ color: "rgba(255,255,255,.3)", fontWeight: 700, fontSize: 13 }}>Loading...</div>
              ) : ecg ? (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <div className="rr-mini" style={{ flex: "1 1 160px" }}>
                    <div className="rr-mini__k">Last ECG Recorded</div>
                    <div className="rr-mini__v" style={{ fontSize: 13 }}>{new Date(ecg.start_time * 1000).toLocaleString()}</div>
                  </div>
                  <div className="rr-mini" style={{ flex: "1 1 160px" }}>
                    <div className="rr-mini__k">Voltage Points Loaded</div>
                    <div className="rr-mini__v" style={{ color: voltages.length > 0 ? "rgba(0,220,110,.9)" : "rgba(255,255,255,.4)" }}>
                      {voltages.length > 0 ? `${voltages.length} pts ✓` : "--"}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ color: "rgba(255,255,255,.3)", fontWeight: 700, fontSize: 13 }}>
                  No ECG sessions found. Record one from your Apple Watch.
                </div>
              )}
            </div>

            {/* Chat window */}
            <div style={{ marginTop: 18, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 20, display: "flex", flexDirection: "column", height: 460, overflow: "hidden" }}>
              {/* Messages */}
              <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 8px", display: "flex", flexDirection: "column", gap: 14 }}>
                {messages.map((msg) => (
                  <div key={msg.id} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                    {msg.role === "assistant" && (
                      <img src={heartlyLogo} alt="Heartly" style={{ width: 32, height: 32, borderRadius: "50%", marginRight: 8, flexShrink: 0, marginTop: 2, objectFit: "cover" }} />
                    )}
                    <div style={{
                      maxWidth: "72%",
                      padding: "10px 14px",
                      borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                      background: msg.role === "user" ? "rgba(232,0,61,.85)" : "rgba(255,255,255,.07)",
                      border: msg.role === "user" ? "none" : "1px solid rgba(255,255,255,.1)",
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: 14,
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                    }}>
                      {msg.loading ? (
                        <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "2px 0" }}>
                          {[0, 1, 2].map((i) => (
                            <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,.4)", animation: "pulse 1.2s ease-in-out infinite", animationDelay: `${i * 0.2}s` }} />
                          ))}
                        </div>
                      ) : msg.text}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              <div style={{ height: 1, background: "rgba(255,255,255,.07)" }} />

              {/* Input */}
              <div style={{ padding: "12px 16px", display: "flex", gap: 10, alignItems: "flex-end" }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Ask about your ECG results…  (Enter to send)"
                  rows={1}
                  style={{ flex: 1, background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 12, padding: "10px 14px", color: "#fff", fontSize: 14, fontWeight: 600, resize: "none", outline: "none", fontFamily: "inherit", lineHeight: 1.5 }}
                />
                <button onClick={send} disabled={!input.trim()} className="rr-btn rr-btn--primary"
                  style={{ padding: "10px 20px", flexShrink: 0, opacity: input.trim() ? 1 : 0.4, transition: "opacity .2s" }}>
                  Send
                </button>
              </div>
            </div>

            {/* Suggested prompts */}
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                "What does my ECG classification mean?",
                "Is sinus rhythm normal?",
                "What is AFib?",
                "Should I be worried?",
              ].map((prompt) => (
                <button key={prompt} className="rr-btn rr-btn--ghost" style={{ fontSize: 12, padding: "6px 14px" }}
                  onClick={() => { setInput(prompt); inputRef.current?.focus(); }}>
                  {prompt}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 16 }} className="rr-note">
              <span className="rr-note__icon">📌</span>
              <span>Not medical advice. Consult a cardiologist or GP for any health concerns.</span>
            </div>
          </div>
        </section>
      </main>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: .3; transform: scale(.8); }
          50% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}