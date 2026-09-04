import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Left Branding Hero */}
      <div className="auth-hero">
        <div className="auth-hero-inner">
          <Link to="/" className="brand-logo">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            <span>DocVault</span>
          </Link>

          <div className="hero-text-group">
            <h2>All your files, intelligently organized.</h2>
            <p>Upload once, search effortlessly, and preview multi-page documents instantly inside a secure vault.</p>
          </div>

          <div className="hero-pills">
            <div className="pill">
              <span className="dot dot-green"></span> End-to-End Encrypted
            </div>
            <div className="pill">
              <span className="dot dot-blue"></span> Instant Previews
            </div>
          </div>
        </div>
      </div>

      {/* Right Form Area (No Card Shadow) */}
      <div className="auth-form-wrapper">
        <div className="auth-form-content">
          <div className="form-header">
            <h1>Welcome back</h1>
            <p>Enter your details to access your vault</p>
          </div>

          {error && <div className="error-banner">{error}</div>}

          <form onSubmit={onSubmit} className="auth-form">
            <div className="field-group">
              <label htmlFor="email">Work Email</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="alex@company.com"
                value={form.email}
                onChange={onChange}
                required
              />
            </div>

            <div className="field-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={onChange}
                required
              />
            </div>

            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <div className="form-footer">
            <span>Don't have an account?</span>
            <Link to="/signup">Create an account</Link>
          </div>
        </div>
      </div>
    </div>
  );
}