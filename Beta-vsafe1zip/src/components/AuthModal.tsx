import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  if (!isOpen) return null;

  const title = mode === "signin" ? "Sign In" : "Create Account";
  const subtitle =
    mode === "signin"
      ? "Come back to your space."
      : "Set up a quiet place that remembers you.";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage(
          "Check your email to confirm your account, then sign in here."
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        setMessage("Signed in. You can close this window.");
      }
    } catch (err: any) {
      console.error(err);
      setMessage(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      className="auth-backdrop"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background:
          "radial-gradient(circle at top, rgba(0,0,0,0.55), rgba(0,0,0,0.85))",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        className="auth-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "380px",
          width: "90%",
          borderRadius: "28px",
          padding: "28px 26px 24px",
          background:
            "radial-gradient(circle at top, #292f2c, #141716) border-box",
          border: "1px solid rgba(255,255,255,0.04)",
          boxShadow:
            "0 18px 40px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.02)",
          color: "#f5f1e9",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          position: "relative",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 18,
            right: 18,
            borderRadius: "999px",
            width: 28,
            height: 28,
            border: "none",
            background: "rgba(0,0,0,0.35)",
            color: "#e9e3d5",
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          ×
        </button>

        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              letterSpacing: "0.35em",
              textTransform: "uppercase",
              fontSize: 10,
              color: "rgba(229, 220, 204, 0.7)",
              marginBottom: 12,
            }}
          >
            TRACE
          </div>
          <h2
            style={{
              fontSize: 24,
              margin: 0,
              marginBottom: 6,
              fontWeight: 600,
            }}
          >
            {title}
          </h2>
          <p
            style={{
              fontSize: 14,
              margin: 0,
              color: "rgba(235, 227, 212, 0.78)",
            }}
          >
            {subtitle}
          </p>
        </div>

        {/* Toggle */}
        <div
          style={{
            display: "flex",
            background: "rgba(0,0,0,0.35)",
            borderRadius: 999,
            padding: 3,
            marginBottom: 14,
          }}
        >
          <button
            onClick={() => setMode("signin")}
            style={{
              flex: 1,
              borderRadius: 999,
              border: "none",
              padding: "8px 0",
              cursor: "pointer",
              fontSize: 13,
              background:
                mode === "signin"
                  ? "rgba(236, 227, 212, 0.12)"
                  : "transparent",
              color:
                mode === "signin"
                  ? "#f5f1e9"
                  : "rgba(236, 227, 212, 0.68)",
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode("signup")}
            style={{
              flex: 1,
              borderRadius: 999,
              border: "none",
              padding: "8px 0",
              cursor: "pointer",
              fontSize: 13,
              background:
                mode === "signup"
                  ? "rgba(236, 227, 212, 0.12)"
                  : "transparent",
              color:
                mode === "signup"
                  ? "#f5f1e9"
                  : "rgba(236, 227, 212, 0.68)",
            }}
          >
            Create Account
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ marginTop: 6 }}>
          <label
            style={{
              display: "block",
              fontSize: 12,
              marginBottom: 6,
              color: "rgba(235, 227, 212, 0.7)",
            }}
          >
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 11px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(7, 8, 8, 0.9)",
              color: "#f5f1e9",
              fontSize: 14,
              marginBottom: 10,
              outline: "none",
              boxSizing: "border-box",
            }}
          />

          <label
            style={{
              display: "block",
              fontSize: 12,
              marginBottom: 6,
              color: "rgba(235, 227, 212, 0.7)",
            }}
          >
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            minLength={6}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 11px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(7, 8, 8, 0.9)",
              color: "#f5f1e9",
              fontSize: 14,
              marginBottom: 14,
              outline: "none",
              boxSizing: "border-box",
            }}
          />

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: "100%",
              borderRadius: 999,
              border: "none",
              padding: "10px 0",
              marginTop: 2,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
              background:
                "linear-gradient(135deg, #d9c9a6, #9bb59a, #70847f)",
              color: "#111210",
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading
              ? mode === "signin"
                ? "Signing in..."
                : "Creating account..."
              : title}
          </button>
        </form>

        {message && (
          <p
            style={{
              marginTop: 10,
              fontSize: 12,
              color: "rgba(236, 227, 212, 0.86)",
            }}
          >
            {message}
          </p>
        )}

        <p
          style={{
            marginTop: 12,
            fontSize: 11,
            color: "rgba(236, 227, 212, 0.6)",
          }}
        >
          TRACE is a wellness companion, not a replacement for professional
          mental health care.
        </p>
      </div>
    </div>
  );
}
