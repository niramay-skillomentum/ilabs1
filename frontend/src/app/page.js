"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveSession } from "../lib/auth";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    if (!email || !password) {
      setErrorMsg("Email and password are required");
      setIsLoading(false);
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
          sessionStorage.setItem("auth_token", data.token);
          sessionStorage.setItem("justLoggedIn", "true");
          saveSession(data.user.email, data.user.fullName);

          router.push("/dashboard");
        } else {
          setErrorMsg(data.error || "Login failed. Please check your credentials.");
        }
      } else {
        if (!fullName) {
          setErrorMsg("Full Name is required for registration");
          setIsLoading(false);
          return;
        }

        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fullName, email, password })
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
          toast.success("Registration successful! Please sign in.");
          setIsLoginMode(true);
        } else {
          setErrorMsg(data.error || "Registration failed. Please try again.");
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex font-sans bg-white overflow-hidden">
      {/* Left Side - Login Form Section (Light Theme) */}
      <div className="w-full lg:w-1/2 h-full overflow-y-auto flex flex-col justify-between p-6 sm:p-8 md:p-10 lg:p-12 relative text-[#05122C] z-10 bg-white">
        {/* Subtle radial yellow glow in bottom-left */}
        <div className="absolute bottom-0 left-0 -translate-x-1/3 translate-y-1/3 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-[#f9f2d5]/80 via-[#FAD02C]/20 to-transparent blur-3xl pointer-events-none -z-10" />

        {/* Main Header & Form Container */}
        <div className="my-auto max-w-sm w-full mx-auto lg:mx-0">
          {/* Logo */}
          <img 
            src="/skillomentum-logo.png" 
            alt="Skillomentum - Skillup with Skillomentum" 
            className="h-8 sm:h-10 w-auto mb-6 object-contain"
          />

          {/* Pill Badge */}
          <div className="bg-[#f9f2d5]/90 border border-[#FAD02C]/50 rounded-full px-3.5 py-1.5 mb-5 flex items-center gap-2.5 w-fit shadow-xs">
            <svg className="w-4 h-4 flex-shrink-0 text-[#05122C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="font-extrabold text-[#05122C] text-[11px] sm:text-xs tracking-wide leading-tight uppercase">
              AI-Powered Investment Banking Operations Simulator
            </span>
          </div>

          {/* Main Titles */}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#05122C] tracking-tight mb-1.5 font-sans">
            {isLoginMode ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="text-[#4F5772] text-xs sm:text-sm mb-6 font-normal leading-relaxed">
            {isLoginMode 
              ? "Sign in to access your AI-powered banking simulation workspace."
              : "Register to access your AI-powered banking simulation workspace."}
          </p>

          {/* Error Message Display */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold flex items-center gap-2 animate-shake">
              <svg className="w-4 h-4 flex-shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5 w-full">
            {!isLoginMode && (
              <div>
                <label className="block text-xs sm:text-sm font-bold text-[#05122C] mb-1">
                  Full Name
                </label>
                <input 
                  type="text" 
                  placeholder="John Doe" 
                  required 
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#05122C]/15 bg-[#f2f2f2] text-[#05122C] placeholder-[#4F5772]/50 focus:outline-none focus:ring-2 focus:ring-[#FAD02C] focus:bg-white transition-all duration-200 text-sm font-medium"
                />
              </div>
            )}

            <div>
              <label className="block text-xs sm:text-sm font-bold text-[#05122C] mb-1">
                Email Address
              </label>
              <input 
                type="email" 
                placeholder="name@example.com" 
                required 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#05122C]/15 bg-[#f2f2f2] text-[#05122C] placeholder-[#4F5772]/50 focus:outline-none focus:ring-2 focus:ring-[#FAD02C] focus:bg-white transition-all duration-200 text-sm font-medium"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs sm:text-sm font-bold text-[#05122C]">
                  Password
                </label>
                {isLoginMode && (
                  <button 
                    type="button"
                    onClick={() => toast("Please contact your workstation admin or supervisor to reset your credentials.", { icon: "🔒", style: { fontSize: '13px' } })}
                    className="text-xs font-extrabold text-[#0A7955] hover:underline focus:outline-none"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  required 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 pr-11 rounded-xl border border-[#05122C]/15 bg-[#f2f2f2] text-[#05122C] placeholder-[#4F5772]/50 focus:outline-none focus:ring-2 focus:ring-[#FAD02C] focus:bg-white transition-all duration-200 text-sm font-medium tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4F5772] hover:text-[#05122C] focus:outline-none p-1 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className={`w-full flex items-center justify-center gap-2 py-3 px-5 mt-2 bg-[#FAD02C] hover:bg-[#F3A714] text-[#000000] font-extrabold text-sm uppercase tracking-wider rounded-xl shadow-[0_4px_14px_rgba(250,208,44,0.3)] hover:shadow-[0_6px_20px_rgba(243,167,20,0.4)] transform transition-all duration-200 ${isLoading ? 'opacity-80 cursor-not-allowed' : 'hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]'}`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>{isLoginMode ? "SIGN IN" : "REGISTER"}</span>
                  <svg className="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </>
              )}
            </button>
          </form>

          {/* Mode Switcher */}
          <div className="mt-6 text-center w-full">
            <p className="text-xs sm:text-sm font-medium text-[#4F5772]">
              {isLoginMode ? "Don't have an account? " : "Already have an account? "}
              <button 
                type="button"
                onClick={() => {
                  setIsLoginMode(!isLoginMode);
                  setErrorMsg("");
                }}
                className="text-[#0A7955] font-extrabold hover:underline transition-colors duration-200 ml-1"
              >
                {isLoginMode ? "Register here" : "Sign in"}
              </button>
            </p>
          </div>
        </div>

        {/* Footer Copyright */}
        <div className="pt-4 text-[11px] sm:text-xs font-medium text-[#4F5772] text-center lg:text-left">
          © {new Date().getFullYear()} Skillomentum. All rights reserved.
        </div>
      </div>

      {/* Right Side - Dark Theme Branding & Simulation Showcase */}
      <div className="hidden lg:flex lg:w-1/2 h-full overflow-y-auto bg-[#05122C] text-white flex-col justify-between p-8 xl:p-12 relative z-10">
        {/* Ambient background glows and pattern */}
        <div className="absolute top-0 right-0 translate-x-1/3 -translate-y-1/3 w-[500px] h-[500px] rounded-full bg-gradient-to-bl from-[#FAD02C]/15 via-[#F3A714]/5 to-transparent blur-3xl pointer-events-none -z-10" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-blue-600/10 to-transparent blur-3xl pointer-events-none -z-10" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:3rem_3rem] pointer-events-none -z-10" />

        {/* Top Content Area */}
        <div className="my-auto max-w-xl">
          {/* Logo */}
          <img 
            src="/skillomentum-logo.png" 
            alt="Skillomentum - Skillup with Skillomentum" 
            className="h-8 sm:h-10 w-auto mb-6 object-contain drop-shadow-[0_1px_3px_rgba(255,255,255,0.35)]"
          />

          {/* Subheading Banner Tag */}
          <div className="flex items-center gap-2 mb-4 z-10">
            <svg className="w-4 h-4 text-[#FAD02C] flex-shrink-0 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
            </svg>
            <span className="text-[#FAD02C] font-extrabold text-xs tracking-widest uppercase">
              AI-Powered Banking Operations & Workforce Simulation Platform
            </span>
          </div>

          {/* Impactful Headlines */}
          <h2 className="text-3xl md:text-4xl xl:text-5xl font-black tracking-tight leading-[1.08] mb-4 font-sans">
            <span className="block text-white mb-0.5">Train. Assess.</span>
            <span className="block text-[#FAD02C] drop-shadow-[0_2px_10px_rgba(250,208,44,0.25)]">Excel.</span>
          </h2>

          {/* Descriptive Text */}
          <p className="text-[#CED1DC]/90 text-xs sm:text-sm leading-relaxed mb-8 font-normal">
            Deliver immersive investment banking simulations that bridge the gap between academic learning and real-world operations. Built for students, educational institutions, and enterprise teams seeking practical, measurable, and scalable workforce development.
          </p>

          {/* 4 Feature Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-8">
            <div className="bg-[#0a1738]/80 backdrop-blur-md border border-white/10 hover:border-[#FAD02C]/40 rounded-xl p-3 flex flex-col items-center justify-center text-center shadow-lg transition-all duration-300 group">
              <span className="text-lg sm:text-xl font-black text-[#FAD02C] group-hover:scale-105 transition-transform duration-200">1000+</span>
              <span className="text-[11px] text-[#CED1DC] mt-0.5 font-medium">Simulation Sessions</span>
            </div>

            <div className="bg-[#0a1738]/80 backdrop-blur-md border border-white/10 hover:border-[#FAD02C]/40 rounded-xl p-3 flex flex-col items-center justify-center text-center shadow-lg transition-all duration-300 group">
              <span className="text-lg sm:text-xl font-black text-[#FAD02C] group-hover:scale-105 transition-transform duration-200">20+</span>
              <span className="text-[11px] text-[#CED1DC] mt-0.5 font-medium">Banking Workflows</span>
            </div>

            <div className="bg-[#0a1738]/80 backdrop-blur-md border border-white/10 hover:border-[#FAD02C]/40 rounded-xl p-3 flex flex-col items-center justify-center text-center shadow-lg transition-all duration-300 group">
              <span className="text-lg sm:text-xl font-black text-[#FAD02C] group-hover:scale-105 transition-transform duration-200">AI</span>
              <span className="text-[11px] text-[#CED1DC] mt-0.5 font-medium">Skill Assessment</span>
            </div>

            <div className="bg-[#0a1738]/80 backdrop-blur-md border border-white/10 hover:border-[#FAD02C]/40 rounded-xl p-3 flex flex-col items-center justify-center text-center shadow-lg transition-all duration-300 group">
              <span className="text-lg sm:text-xl font-black text-[#FAD02C] group-hover:scale-105 transition-transform duration-200">✦</span>
              <span className="text-[11px] text-[#CED1DC] mt-0.5 font-medium">Enterprise Ready</span>
            </div>
          </div>

          {/* Checklist Feature Points */}
          <ul className="space-y-2.5 mb-8">
            {[
              "Real-world investment banking operations simulation",
              "AI-driven performance evaluation and personalized feedback",
              "Built for students, institutions, and corporate workforce training",
              "Scalable learning with realistic operational workflows"
            ].map((item, idx) => (
              <li key={idx} className="flex items-center gap-2.5 text-xs sm:text-sm text-[#CED1DC] font-medium">
                <div className="w-4 h-4 rounded-full bg-[#FAD02C]/20 flex items-center justify-center flex-shrink-0 text-[#FAD02C]">
                  <svg className="w-2.5 h-2.5 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Trusted Placement Partners */}
        <div className="pt-2">
          <div className="text-[#64748B] text-[10px] font-bold tracking-[0.18em] uppercase mb-2.5">
            Trusted Placement Partners
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {["Accenture", "Wipro", "Citi", "IndiGo", "Tata"].map((partner, index) => (
              <span 
                key={index}
                className="bg-[#0e214d]/90 border border-white/10 rounded-full px-3.5 py-1 text-xs font-semibold text-slate-300 shadow-sm hover:text-white hover:border-[#FAD02C]/40 hover:bg-[#122a63] transition-all cursor-default"
              >
                {partner}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom Right Floating Question/Help Button */}
        <button 
          type="button"
          onClick={() => toast("Need assistance? Contact Skillomentum Support at support@skillomentum.com", { icon: "💡", style: { fontSize: '13px' } })}
          className="absolute bottom-6 right-6 w-9 h-9 bg-white hover:bg-[#FAD02C] text-[#05122C] font-black text-base rounded-full flex items-center justify-center shadow-[0_4px_14px_rgba(0,0,0,0.4)] hover:shadow-[0_6px_18px_rgba(250,208,44,0.5)] transition-all duration-200 hover:scale-105 active:scale-95 z-20"
          title="Help & Support"
        >
          ?
        </button>
      </div>
    </div>
  );
}
