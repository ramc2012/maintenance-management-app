import React, { useState } from "react";
import axios from "axios";
import { useAuth } from "../../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { HelpCircle } from "lucide-react";

export const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post("/api/auth/login", {
        username,
        password,
      });
      login(response.data.token, response.data.user);
      navigate("/hub");
    } catch (err) {
      setError("Invalid credentials");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 relative">
      {/* User Guide Button - Top Right */}
      <a 
        href="/help.html" 
        target="_blank" 
        rel="noopener noreferrer"
        className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 text-purple-400 hover:text-purple-300 hover:bg-purple-900/20 rounded-lg transition-colors border border-purple-700"
      >
        <HelpCircle className="w-5 h-5" />
        <span className="text-sm font-medium">User Guide</span>
      </a>

      <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg shadow-lg">
        <div className="flex flex-col items-center mb-6 text-center">
            <img src="/ongc_logo.jpg" alt="ONGC Logo" className="w-20 h-20 object-contain mb-4" />
            <h1 className="text-lg font-bold text-white uppercase tracking-wide">Maintenance Information System</h1>
            <p className="text-sm font-medium text-red-400 mt-1">ONGC · Ankleshwar Asset</p>
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-400">Sign in to your account</h2>

        {error && <p className="text-red-500 text-center">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 mt-1 text-white bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 mt-1 text-white bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full px-4 py-2 font-bold text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
};
