import { Link } from "react-router-dom";
import "./landing.css";

export default function ECGCollection() {
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
            <Link className="rr-btn rr-btn--ghost rr-btn--nav" to="/dashboard">Dashboard</Link>
            <Link className="rr-btn rr-btn--ghost rr-btn--nav" to="/session">Session</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="rr-section">
          <div className="rr-section__inner">
            <h2 className="rr-h2">ECG Collection</h2>
            <p className="rr-lead">
              Your electrocardiogram (ECG) records captured from your Apple Watch are stored here.
              Each ECG is a snapshot of your heart's electrical activity, recorded directly from your wrist.
            </p>

            {/* What is ECG */}
            <div className="rr-feature" style={{ marginTop: 24 }}>
              <h3 style={{ marginTop: 0 }}>What is ECG Collection?</h3>
              <p style={{ color: "rgba(255,255,255,.72)", fontWeight: 700, lineHeight: 1.7, margin: 0 }}>
                An ECG (electrocardiogram) measures the electrical signals that make your heart beat.
                The Apple Watch can record a single-lead ECG in about 30 seconds by placing your finger
                on the Digital Crown. RedlineRanch stores these recordings from your iPhone and displays
                them here so you can track your heart rhythm over time, spot anomalies, and share records
                with a healthcare professional if needed.
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
                <div className="rr-mini" style={{ flex: "1 1 160px" }}>
                  <div className="rr-mini__k">How to record</div>
                  <div className="rr-mini__v" style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,.72)" }}>
                    Open Health app → Heart → ECG
                  </div>
                </div>
                <div className="rr-mini" style={{ flex: "1 1 160px" }}>
                  <div className="rr-mini__k">Duration</div>
                  <div className="rr-mini__v">~30 seconds</div>
                </div>
                <div className="rr-mini" style={{ flex: "1 1 160px" }}>
                  <div className="rr-mini__k">Device required</div>
                  <div className="rr-mini__v">Apple Watch Series 4+</div>
                </div>
              </div>
            </div>

            {/* Empty state */}
            <div className="rr-feature" style={{ marginTop: 18 }}>
              <h3 style={{ marginTop: 0 }}>Your ECG Records</h3>
              <div style={{
                marginTop: 14,
                padding: "40px 20px",
                borderRadius: 16,
                border: "1px dashed rgba(255,255,255,.12)",
                background: "rgba(255,255,255,.02)",
                textAlign: "center",
              }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📉</div>
                <div style={{ color: "rgba(255,255,255,.72)", fontWeight: 800, fontSize: 16, marginBottom: 8 }}>
                  No ECG records yet
                </div>
                <div style={{ color: "rgba(255,255,255,.4)", fontWeight: 700, fontSize: 13, maxWidth: 380, margin: "0 auto" }}>
                  Record an ECG on your Apple Watch and send it via the RedlineRanch iPhone app. It will appear here automatically.
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}