import { useState, useEffect } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import React from "react";
import MovieList from "./components/MovieList";
import { Routes, Route, Navigate } from "react-router-dom";
import MovieDetails from "./components/MovieDetails";
import Login from "./components/auth/Login";
import SignUp from "./components/auth/SignUp";
import { auth } from "../backend/firebase";
import { AuthProvider } from "./contexts/AuthContext";
import Settings from "./components/Settings";
import Profile from "./components/Profile";

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#f47521]"></div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#0B0B0F]">
        <Routes>
          <Route
            path="/login"
            element={!user ? <Login /> : <Navigate to="/" />}
          />
          <Route
            path="/signup"
            element={!user ? <SignUp /> : <Navigate to="/" />}
          />
          <Route
            path="/"
            element={
              user ? (
                <>
                  <header className="fixed top-0 w-full z-50 bg-[#0B0B0F]/90 backdrop-blur-md border-b border-gray-800">
                    <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                      <h1 className="text-2xl font-bold text-white">
                        🎬 MovieBox
                      </h1>
                      <Settings />
                    </div>
                  </header>
                  <main className="pt-16">
                    <MovieList />
                  </main>
                </>
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/profile"
            element={user ? <Profile /> : <Navigate to="/login" />}
          />
        </Routes>
      </div>
    </AuthProvider>
  );
};

export default App;
