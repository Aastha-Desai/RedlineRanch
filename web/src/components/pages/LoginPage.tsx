import { Link, useNavigate } from "react-router-dom";
import "./landing.css";

export default function LoginPage() {
  const navigate = useNavigate();

  return (
    <div className="rr-auth">
      <div className="rr-authCard">

        {/* Header */}
        <div className="rr-authTop">
          <div>
            <h1 className="rr-authTitle">Log in</h1>
            <p className="rr-authSubtitle">
              Access your heart insights dashboard.
            </p>
          </div>

          <Link className="rr-authHome" to="/">
            Back
          </Link>
        </div>

        {/* Form */}
        <form
          className="rr-authForm"
          onSubmit={(e) => {
            e.preventDefault();
            navigate("/dashboard"); // redirect after login
          }}
        >
          <label className="rr-authLabel">
            Email
            <input
              className="rr-authInput"
              placeholder="you@domain.com"
              type="email"
              required
            />
          </label>

          <label className="rr-authLabel">
            Password
            <input
              className="rr-authInput"
              placeholder="••••••••"
              type="password"
              required
            />
          </label>

          <button className="rr-authPrimary" type="submit">
            Continue
          </button>

          <div className="rr-authDivider" />

          <div className="rr-authBottom">
            <span>Don’t have an account?</span>
            <Link to="/signup" className="rr-authLink">
              Sign up
            </Link>
          </div>

          <p className="rr-authFine">
            Not a medical device. For wellness insights only.
          </p>
        </form>

      </div>
    </div>
  );
}