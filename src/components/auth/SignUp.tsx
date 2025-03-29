import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../../backend/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";

const SignUp = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigate("/");
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0B0F]">
      <div className="bg-[#1A1A1F] p-8 rounded-lg w-full max-w-md">
        <h2 className="text-3xl font-bold text-white mb-6">Sign Up</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#2C2C35] text-white p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-[#f47521]"
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#2C2C35] text-white p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-[#f47521]"
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Confirm Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#2C2C35] text-white p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-[#f47521]"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-[#f47521] text-white py-3 rounded-md hover:bg-[#ff8534] transition-colors"
          >
            Sign Up
          </button>
        </form>
        <p className="text-gray-400 mt-4 text-center">
          Already have an account?{" "}
          <a href="/login" className="text-[#f47521] hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
};

export default SignUp;
