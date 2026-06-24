"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

export default function LoginPage() {
  const router = useRouter();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    if (!email || !password) {
      setErrorMsg("Email and password are required");
      return;
    }

    try {
      if (isLoginMode) {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
          Cookies.set("auth_token", data.token, { expires: 3/24, path: '/', sameSite: 'Lax' });
          sessionStorage.setItem("auth_token", data.token);
          sessionStorage.setItem("justLoggedIn", "true");

          router.push(`/dashboard?userId=${encodeURIComponent(data.user.email)}&fullName=${encodeURIComponent(data.user.fullName)}`);
        } else {
          setErrorMsg(data.error || "Login failed");
        }
      } else {
        if (!fullName) {
          setErrorMsg("Full Name is required for registration");
          return;
        }

        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fullName, email, password })
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
          alert("Registration successful! Please login.");
          setIsLoginMode(true);
        } else {
          setErrorMsg(data.error || "Registration failed");
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 font-sans px-4">
      
      {/* Header / Logo Area */}
      <div className="mb-10 text-center">
        <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-white tracking-tight drop-shadow-md">
          Skillomentum Global Bank
        </h1>
        <p className="text-blue-200 mt-2 text-sm md:text-base font-medium tracking-wide">
          Operations Simulator
        </p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-8 md:p-10 transform transition-all hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">
          {isLoginMode ? "Welcome Back" : "Create Account"}
        </h2>
        
        {errorMsg && (
          <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm text-center font-medium animate-pulse">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLoginMode && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
              <input 
                type="text" 
                placeholder="John Doe" 
                required 
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200 shadow-sm"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
            <input 
              type="email" 
              placeholder="name@example.com" 
              required 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200 shadow-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              required 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200 shadow-sm"
            />
          </div>
          
          <button 
            type="submit"
            disabled={isLoading}
            className={`w-full flex items-center justify-center py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transform transition-all duration-200 ${isLoading ? 'opacity-80 cursor-not-allowed' : 'hover:-translate-y-0.5 active:translate-y-0'}`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              isLoginMode ? "Sign In" : "Register"
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            type="button"
            onClick={() => {
              setIsLoginMode(!isLoginMode);
              setErrorMsg("");
            }}
            className="text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors duration-200"
          >
            {isLoginMode ? "Need an account? Register here" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
      
      <div className="mt-8 text-slate-400 text-xs font-medium">
        © {new Date().getFullYear()} Niramay Skillomentum. All rights reserved.
      </div>
    </div>
  );
}
