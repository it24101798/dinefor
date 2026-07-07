import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const API_URL = "http://localhost:5000/api";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    if (!email || !password) {
      setMessage("Please enter both email and password.");
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
      }, {
        timeout: 10000,
      });

      const user = res.data.user;
      
      if (!user) {
        setMessage("Invalid response from server.");
        setLoading(false);
        return;
      }

      login(user);

      if (user.role === "admin") {
        navigate("/admin");
      } else if (user.role === "hotel") {
        navigate("/hotel");
      } else {
        navigate("/feed");
      }

    } catch (error) {
      console.error("Login error:", error);
      
      if (error.code === "ERR_NETWORK") {
        setMessage("Cannot connect to server. Please make sure the backend is running.");
      } else if (error.response) {
        setMessage(error.response.data?.message || "Login failed. Please check your credentials.");
      } else {
        setMessage("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-surface-cream flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-ambient border border-border-subtle">
          <div className="text-center mb-8">
            <h1 className="font-headline-lg text-headline-lg text-text-deep-green">Welcome Back</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2">
              Sign in to continue discovering premium buffets
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="customer@dinefor.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input w-full"
                required
              />
            </div>

            <div>
              <label className="font-label-sm text-label-sm text-on-surface-variant block mb-1">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input w-full"
                required
              />
            </div>

            {message && (
              <div className={`p-3 rounded-lg text-sm font-medium ${
                message.includes("Cannot connect") || message.includes("failed") || message.includes("Invalid")
                  ? "bg-error/10 text-error"
                  : "bg-secondary-container/30 text-secondary"
              }`}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-surface-cream border-t-transparent" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="font-body-md text-body-md text-on-surface-variant">
              New to DineFor?{" "}
              <Link to="/register" className="text-secondary hover:underline font-semibold">
                Create account
              </Link>
            </p>
          </div>

          <div className="mt-4 text-center">
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              Demo: customer@dinefor.com / 123456
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default Login;