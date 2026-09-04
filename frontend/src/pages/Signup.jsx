import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState("REGISTER");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [otp, setOtp] = useState("");

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmitSignup = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to register.");

      setInfo(data.message || "OTP code sent to your email.");
      setStep("VERIFY_OTP");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onSubmitOtp = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, otp }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed.");

      if (loginWithToken) {
        loginWithToken(data.token, data.user);
      } else {
        localStorage.setItem("token", data.token);
      }

      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setInfo("");
    setResending(true);

    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resend code.");

      setInfo(data.message || "A new OTP code has been sent.");
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
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
            <h2>Your documents, perfectly organized in one place.</h2>
            <p>Get started in seconds. Upload, organize, and manage your file archive with real-time speed.</p>
          </div>

          <div className="hero-pills">
            <div className="pill">
              <span className="dot dot-green"></span> Fast Multi-Page Preview
            </div>
            <div className="pill">
              <span className="dot dot-blue"></span> Verified Email Access
            </div>
          </div>
        </div>
      </div>

      {/* Right Form Area */}
      <div className="auth-form-wrapper">
        <div className="auth-form-content">
          <div className="form-header">
            <h1>{step === "REGISTER" ? "Create an account" : "Check your inbox"}</h1>
            <p>
              {step === "REGISTER"
                ? "Start managing your documents securely today"
                : `Enter the 6-digit verification code sent to ${form.email}`}
            </p>
          </div>

          {error && <div className="error-banner">{error}</div>}
          {info && <div className="info-banner">{info}</div>}

          {step === "REGISTER" ? (
            <form onSubmit={onSubmitSignup} className="auth-form">
              <div className="field-group">
                <label htmlFor="name">Full Name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Alex Morgan"
                  value={form.name}
                  onChange={onChange}
                  required
                />
              </div>

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
                  placeholder="At least 6 characters"
                  minLength={6}
                  value={form.password}
                  onChange={onChange}
                  required
                />
              </div>

              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? "Sending OTP…" : "Create Account"}
              </button>
            </form>
          ) : (
            <form onSubmit={onSubmitOtp} className="auth-form">
              <div className="field-group">
                <label htmlFor="otp">Verification Code</label>
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.trim())}
                  className="otp-input"
                  required
                />
              </div>

              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? "Verifying…" : "Verify & Continue"}
              </button>

              <div className="otp-actions">
                <button type="button" className="btn-text" onClick={() => setStep("REGISTER")}>
                  ← Back to details
                </button>
                <button type="button" className="btn-text" onClick={handleResendOtp} disabled={resending}>
                  {resending ? "Sending…" : "Resend code"}
                </button>
              </div>
            </form>
          )}

          <div className="form-footer">
            <span>Already have an account?</span>
            <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}