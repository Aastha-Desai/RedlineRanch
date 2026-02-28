import { Link, useNavigate } from "react-router-dom";
import "./landing.css";

export default function SignupPage() {
  const navigate = useNavigate();

  return (
    <div className="rr-auth">
      <div className="rr-authCard">
        <div className="rr-authTop">
          <div>
            <h1 className="rr-authTitle">Sign up</h1>
            <p className="rr-authSubtitle">
              Create an account to access your dashboard.
            </p>
          </div>

          <Link className="rr-authHome" to="/">
            Back
          </Link>
        </div>

        <form
          className="rr-authForm"
          onSubmit={(e) => {
            e.preventDefault();
            navigate("/dashboard");
          }}
        >
          <label className="rr-authLabel">
            Full name
            <input className="rr-authInput" placeholder="Your name" type="text" required />
          </label>

          <label className="rr-authLabel">
            Email
            <input className="rr-authInput" placeholder="you@domain.com" type="email" required />
          </label>

          <label className="rr-authLabel">
            Password
            <input className="rr-authInput" placeholder="••••••••" type="password" required />
          </label>

          <button className="rr-authPrimary" type="submit">
            Create account
          </button>

          <div className="rr-authDivider" />

          <div className="rr-authBottom">
            <span>Already have an account?</span>
            <Link to="/login" className="rr-authLink">
              Log in
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