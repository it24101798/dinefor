import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("customer@dinefor.com");
  const [password, setPassword] = useState("123456");
  const [message, setMessage] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", {
        email,
        password,
      });

      const user = res.data.user;

      login(user);

      if (user.role === "admin") {
        navigate("/admin");
      } else if (user.role === "hotel") {
        navigate("/hotel");
      } else {
        navigate("/feed");
      }

    } catch (error) {
      setMessage(error.response?.data?.message || "Login failed");
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">Welcome Back</p>
        <h1>Sign in to DineFor</h1>
        <p className="muted">
          Continue discovering and reserving premium buffet experiences.
        </p>

        <form onSubmit={handleLogin} className="auth-form">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button className="btn primary" type="submit">
            Sign In
          </button>
        </form>

        <div className="oauth-row">
          <button className="btn secondary" type="button" disabled>Continue with Google — Coming Soon</button>
          <button className="btn secondary" type="button" disabled>Continue with Facebook — Coming Soon</button>
        </div>

        {message && <p className="error-text">{message}</p>}

        <p className="muted">
          New to DineFor? <Link to="/register">Create account</Link>
        </p>
      </section>
    </main>
  );
}

export default Login;