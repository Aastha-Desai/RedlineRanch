import { useMemo, useState } from "react";
import "./landing.css";

type FAQ = { q: string; a: string };

export default function LandingPage() {
  const [email, setEmail] = useState("");

  const faqs: FAQ[] = useMemo(
    () => [
      {
        q: "What does RedlineRanch measure?",
        a: "It combines your ECG patterns and activity signals to estimate heart wellness trends and flag anomalies worth paying attention to.",
      },
      {
        q: "Is this a medical diagnosis?",
        a: "No. RedlineRanch is for wellness insights and education, not diagnosis or emergency detection. If you feel unwell, seek medical care.",
      },
      {
        q: "Where does my data go?",
        a: "Design goal: your data stays private by default. We only store what’s needed to provide your dashboard, and you can delete your data anytime.",
      },
    ],
    []
  );

  return (
    <div className="rr">
        <header className="rr-nav">
        <div className="rr-nav__inner">
            <a className="rr-brand" href="#top" aria-label="RedlineRanch home">
            <span className="rr-brand__name">RedlineRanch</span>
            <span className="rr-brand__tag">ECG • Fitness • ML</span>
            </a>

            <nav className="rr-links" aria-label="Primary">
            <a className="rr-link" href="#how">How it works</a>
            <a className="rr-link" href="#features">Features</a>
            <a className="rr-link" href="#trust">Trust</a>
            <a className="rr-link" href="#faq">FAQ</a>
            </nav>

            <div className="rr-nav__cta">
            <a className="rr-btn rr-btn--ghost rr-btn--nav" href="#demo">See demo</a>
            <a className="rr-btn rr-btn--ghost rr-btn--nav" href="/login">Log in</a>
            <a className="rr-btn rr-btn--primary rr-btn--nav" href="#get-started">Get started</a>
            </div>
        </div>
        </header>

      <main>
        {/* HERO */}
        <section className="rr-hero">
          <div className="rr-hero__inner">
            <div className="rr-hero__copy">
              <div className="rr-badge">
                <span className="rr-dot" />
                ML-powered ECG + activity insights
              </div>

              <h1 className="rr-title">
                Ride smarter with your heart.
                <span className="rr-title__accent"> Know your rhythm.</span>
              </h1>

              <p className="rr-subtitle">
                RedlineRanch blends ECG signals and exercise patterns to help you
                understand your heart wellness trends—so you can train with
                confidence and catch changes early.
              </p>

              <div className="rr-hero__actions" id="get-started">
                <a className="rr-btn rr-btn--primary rr-btn--big" href="#demo">
                  Connect & view dashboard
                </a>
                <a className="rr-btn rr-btn--ghost rr-btn--big" href="#how">
                  How it works
                </a>
              </div>

              <div className="rr-metrics">
                <div className="rr-metric">
                  <div className="rr-metric__num">ECG + Exercise</div>
                  <div className="rr-metric__label">combined insights</div>
                </div>
                <div className="rr-metric">
                  <div className="rr-metric__num">On-device first</div>
                  <div className="rr-metric__label">privacy by design</div>
                </div>
                <div className="rr-metric">
                  <div className="rr-metric__num">TensorFlow</div>
                  <div className="rr-metric__label">ML detection engine</div>
                </div>
              </div>

              <p className="rr-disclaimer">
                Not a medical device. Not for diagnosis or emergencies.
              </p>
            </div>

            <div className="rr-hero__visual">
              <div className="rr-card rr-card--glass">
                <div className="rr-card__top">
                  <div className="rr-pill">Heart Wellness</div>
                  <div className="rr-chip">Live</div>
                </div>

                <div className="rr-score">
                  <div className="rr-score__value">84</div>
                  <div className="rr-score__meta">
                    <div className="rr-score__label">Ranch Score</div>
                    <div className="rr-score__trend">↑ +6 this week</div>
                  </div>
                </div>

                <div className="rr-wave">
                  <div className="rr-wave__line" />
                  <div className="rr-wave__line rr-wave__line--2" />
                  <div className="rr-wave__line rr-wave__line--3" />
                </div>

                <div className="rr-grid">
                  <div className="rr-mini">
                    <div className="rr-mini__k">Resting HR</div>
                    <div className="rr-mini__v">62 bpm</div>
                  </div>
                  <div className="rr-mini">
                    <div className="rr-mini__k">HRV</div>
                    <div className="rr-mini__v">48 ms</div>
                  </div>
                  <div className="rr-mini">
                    <div className="rr-mini__k">Training</div>
                    <div className="rr-mini__v">4.2 hrs</div>
                  </div>
                  <div className="rr-mini">
                    <div className="rr-mini__k">Flags</div>
                    <div className="rr-mini__v">None</div>
                  </div>
                </div>

                <div className="rr-card__bottom">
                  <div className="rr-note">
                    <span className="rr-note__icon">🫀</span>
                    <span>
                      Your rhythm looks steady. Keep hydration + cooldowns.
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="rr-section" id="how">
          <div className="rr-section__inner">
            <h2 className="rr-h2">How it works</h2>
            <p className="rr-lead">
              A simple loop: collect → analyze → explain → improve.
            </p>

            <div className="rr-steps">
              <div className="rr-step">
                <div className="rr-step__num">1</div>
                <h3>Connect your signals</h3>
                <p>
                  Pull ECG sessions and activity metrics (steps, workouts, heart
                  rate trends) into one timeline.
                </p>
              </div>

              <div className="rr-step">
                <div className="rr-step__num">2</div>
                <h3>ML detection</h3>
                <p>
                  A TensorFlow model detects patterns and flags unusual rhythm
                  segments for review.
                </p>
              </div>

              <div className="rr-step">
                <div className="rr-step__num">3</div>
                <h3>Explainable insights</h3>
                <p>
                  You don’t just get a score—you get “why,” trends, and
                  actionable coaching-style suggestions.
                </p>
              </div>

              <div className="rr-step">
                <div className="rr-step__num">4</div>
                <h3>Track progress</h3>
                <p>
                  Watch your heart wellness improve as you train smarter, sleep
                  better, and manage stress.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="rr-section rr-section--alt" id="features">
          <div className="rr-section__inner">
            <h2 className="rr-h2">Features built for real people</h2>
            <p className="rr-lead">
              Useful even if you don’t know cardiology. Clean, clear, and
              confidence-boosting.
            </p>

            <div className="rr-featureGrid">
              <div className="rr-feature">
                <div className="rr-feature__icon">📈</div>
                <h3>Heart Wellness Score</h3>
                <p>
                  A single score backed by ECG + training metrics, updated as
                  your patterns change.
                </p>
              </div>

              <div className="rr-feature">
                <div className="rr-feature__icon">🧠</div>
                <h3>ML Rhythm Flags</h3>
                <p>
                  Detect odd segments, then see what happened around them
                  (workout load, recovery, stress).
                </p>
              </div>

              <div className="rr-feature">
                <div className="rr-feature__icon">🧭</div>
                <h3>Training Guidance</h3>
                <p>
                  Recommendations based on your trend: push, maintain, or
                  recover—no guesswork.
                </p>
              </div>

              <div className="rr-feature">
                <div className="rr-feature__icon">🔒</div>
                <h3>Privacy-first</h3>
                <p>
                  Designed to work with minimal data sharing. You control what’s
                  stored and when.
                </p>
              </div>

              <div className="rr-feature">
                <div className="rr-feature__icon">⚡</div>
                <h3>Fast dashboard</h3>
                <p>
                  A clean summary that actually helps: trends, anomalies, and
                  next steps in under a minute.
                </p>
              </div>

              <div className="rr-feature">
                <div className="rr-feature__icon">🧰</div>
                <h3>Developer-friendly</h3>
                <p>
                  Modular pages and components so your team can ship features
                  fast and iterate.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* TRUST */}
        <section className="rr-section" id="trust">
          <div className="rr-section__inner">
            <h2 className="rr-h2">Built for trust</h2>
            <p className="rr-lead">
              Heart data is sensitive. We treat it like it matters.
            </p>

            <div className="rr-trustGrid">
              <div className="rr-trust">
                <h3>Transparent scoring</h3>
                <p>
                  We show the factors behind your score: trend signals, activity
                  load, and ECG pattern stability.
                </p>
              </div>
              <div className="rr-trust">
                <h3>Clear safety boundaries</h3>
                <p>
                  Not a medical device. Not for emergencies. We point you to
                  professional care when appropriate.
                </p>
              </div>
              <div className="rr-trust">
                <h3>Privacy defaults</h3>
                <p>
                  Data minimization + user control. Your health journey should
                  stay yours.
                </p>
              </div>
            </div>

            <div className="rr-quoteRow">
              <div className="rr-quote">
                <p>
                  “Finally a dashboard that makes heart data understandable.
                  I’m not guessing anymore.”
                </p>
                <span>— Beta tester</span>
              </div>
              <div className="rr-quote">
                <p>
                  “The mix of ECG + training context is the magic. It tells the
                  whole story.”
                </p>
                <span>— Athlete</span>
              </div>
            </div>
          </div>
        </section>

        {/* DEMO / EMAIL */}
        <section className="rr-section rr-section--cta" id="demo">
          <div className="rr-section__inner rr-cta">
            <h2 className="rr-h2">Be first in the saddle</h2>
            <p className="rr-lead">
              Drop your email to get the demo link and early access updates.
            </p>

            <form
              className="rr-form"
              onSubmit={(e) => {
                e.preventDefault();
                alert(
                  email
                    ? `Thanks! We'll send updates to: ${email}`
                    : "Enter an email first 🙂"
                );
              }}
            >
              <input
                className="rr-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                type="email"
              />
              <button className="rr-btn rr-btn--primary rr-btn--big" type="submit">
                Get early access
              </button>
            </form>

            <p className="rr-small">
              No spam. Just product updates. You can unsubscribe anytime.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="rr-section" id="faq">
          <div className="rr-section__inner">
            <h2 className="rr-h2">FAQ</h2>
            <div className="rr-faq">
              {faqs.map((f) => (
                <details key={f.q} className="rr-faq__item">
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="rr-footer">
        <div className="rr-footer__inner">
          <div className="rr-brand rr-brand--footer">
            <span className="rr-brand__mark">🤠</span>
            <span className="rr-brand__name">RedlineRanch</span>
          </div>
          <div className="rr-footer__links">
            <a href="#features">Features</a>
            <a href="#trust">Trust</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="rr-footer__fine">
            © {new Date().getFullYear()} RedlineRanch. Built for wellness insights.
          </div>
        </div>
      </footer>
    </div>
  );
}