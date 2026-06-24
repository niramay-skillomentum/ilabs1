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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

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
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        body {
            font-family: Arial;
            background: #F5F7FA;
            margin: 0;
        }
        .topbar {
            background: #0B1F3A;
            color: white;
            padding: 24px 35px;
        }
        .topbar-inner {
            display: flex;
            align-items: center;
            gap: 22px;
        }
        .title { font-size: 26px; font-weight: 600; }

        .login-box {
            width: 340px;
            margin: 100px auto;
            background: white;
            padding: 30px;
            border-radius: 6px;
            box-shadow: 0 3px 10px rgba(0,0,0,0.1);
        }

        .login-box input {
            width: 100%;
            padding: 10px;
            margin-top: 12px;
            box-sizing: border-box;
        }

        .login-box button {
            width: 100%;
            padding: 12px;
            margin-top: 16px;
            background: #FFC107;
            border: none;
            font-weight: bold;
            cursor: pointer;
        }

        .toggle-link {
            display: block;
            text-align: center;
            margin-top: 15px;
            color: #0B1F3A;
            text-decoration: underline;
            cursor: pointer;
            font-size: 14px;
        }

        .error-msg {
            color: red;
            font-size: 14px;
            margin-top: 10px;
            text-align: center;
        }
      `}} />

      <div className="topbar">
          <div className="topbar-inner">
              <div className="title">Skillomentum Global Bank Operations Simulator</div>
          </div>
      </div>

      <div className="login-box">
          <h2>{isLoginMode ? "Login" : "Register"}</h2>
          
          {errorMsg && <div className="error-msg">{errorMsg}</div>}

          <form onSubmit={handleSubmit}>
              {!isLoginMode && (
                  <div>
                      <input 
                        type="text" 
                        placeholder="Full Name" 
                        required 
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                      />
                  </div>
              )}
              <input 
                type="email" 
                placeholder="Email Address" 
                required 
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <input 
                type="password" 
                placeholder="Password" 
                required 
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              
              <button type="submit">{isLoginMode ? "Login" : "Register"}</button>
          </form>

          <a className="toggle-link" onClick={() => {
            setIsLoginMode(!isLoginMode);
            setErrorMsg("");
          }}>
              {isLoginMode ? "Need an account? Register here" : "Already have an account? Login here"}
          </a>
      </div>
    </>
  );
}
