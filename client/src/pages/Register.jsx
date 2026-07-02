import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "customer",
  });

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    try {
      await axios.post("http://localhost:5000/api/auth/register", formData);

      setMessage("Account created successfully ✅");

      setTimeout(() => {
        navigate("/login");
      }, 800);
    } catch (error) {
      setMessage(error.response?.data?.message || "Registration failed");
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">Join DineFor</p>
        <h1>Create your account</h1>
        <p className="muted">
          Register as a guest or hotel partner and start using DineFor.
        </p>

        <form onSubmit={handleRegister} className="auth-form">
          <input
            type="text"
            name="name"
            placeholder="Full name / Hotel contact name"
            value={formData.name}
            onChange={handleChange}
            required
          />

          <input
            type="email"
            name="email"
            placeholder="Email address"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />

          <select name="role" value={formData.role} onChange={handleChange}>
            <option value="customer">Guest / Customer</option>
            <option value="hotel">Hotel Partner</option>
          </select>

          <button className="btn primary" type="submit">
            Create Account
          </button>
        </form>

        <div className="oauth-row">
          <button className="btn secondary" type="button" disabled>Continue with Google — Coming Soon</button>
          <button className="btn secondary" type="button" disabled>Continue with Facebook — Coming Soon</button>
        </div>

        {message && <p className="success-text">{message}</p>}

        <p className="muted">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}

export default Register;