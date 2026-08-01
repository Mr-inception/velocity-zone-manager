import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { signup } from "../api/auth";
import { API_URL } from "../api/client";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await signup(email, password);
      localStorage.setItem("token", res.token);
      navigate("/dashboard");
    } catch (err: any) {
      const message =
        err.response?.data?.error ||
        (err.request && !err.response
          ? `Cannot reach API at ${API_URL}. Set VITE_API_URL to your backend URL on Render and redeploy the frontend.`
          : "Signup failed.");
      setError(message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6">Create Account</h1>
        {error && <div className="bg-red-100 text-red-700 p-2 rounded mb-4 text-sm">{error}</div>}
        <input type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded p-2 mb-3" required />
        <input type="password" placeholder="Password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded p-2 mb-3" required />
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
          Sign Up
        </button>
        <p className="text-sm text-center mt-4">
          Already have an account? <Link to="/login" className="text-blue-600">Log in</Link>
        </p>
      </form>
    </div>
  );
}
