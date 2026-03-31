import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

const ToastContext = createContext(null);

let globalToast = null;

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (ctx) return ctx;
  return globalToast || { show: () => {} };
};

export const toast = {
  success: (message) => globalToast?.show(message, "success"),
  error: (message) => globalToast?.show(message, "error"),
  info: (message) => globalToast?.show(message, "info"),
};

const ICONS = {
  success: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="10" fill="#16a34a" />
      <path d="M6 10.5l2.5 2.5 5.5-5.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  error: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="10" fill="#dc2626" />
      <path d="M7 7l6 6M13 7l-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  info: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="10" fill="#F38100" />
      <circle cx="10" cy="6.5" r="1.2" fill="#fff" />
      <rect x="9" y="9" width="2" height="5" rx="1" fill="#fff" />
    </svg>
  ),
};

function ToastItem({ id, message, type, onDismiss }) {
  const [state, setState] = useState("entering");

  useEffect(() => {
    requestAnimationFrame(() => setState("visible"));
    const timer = setTimeout(() => {
      setState("exiting");
      setTimeout(() => onDismiss(id), 300);
    }, 3500);
    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  const handleDismiss = () => {
    setState("exiting");
    setTimeout(() => onDismiss(id), 300);
  };

  const transform =
    state === "entering"
      ? "translateY(-20px)"
      : state === "exiting"
      ? "translateY(-20px)"
      : "translateY(0)";
  const opacity = state === "visible" ? 1 : 0;

  return (
    <div
      onClick={handleDismiss}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "14px 20px",
        background: "rgba(255, 255, 255, 0.98)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRadius: "14px",
        boxShadow:
          "0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)",
        border: "1px solid rgba(255, 255, 255, 0.5)",
        cursor: "pointer",
        transform,
        opacity,
        transition: "all 300ms cubic-bezier(0.4, 0, 0.2, 1)",
        maxWidth: "420px",
        width: "calc(100vw - 32px)",
        pointerEvents: "auto",
      }}
    >
      <div style={{ flexShrink: 0 }}>{ICONS[type]}</div>
      <span
        style={{
          fontSize: "15px",
          fontWeight: 500,
          color: "#111827",
          lineHeight: 1.4,
          flex: 1,
          wordBreak: "break-word",
        }}
      >
        {message}
      </span>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  let idCounter = React.useRef(0);

  const show = useCallback((message, type = "info") => {
    const id = ++idCounter.current;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const ctx = React.useMemo(
    () => ({ show, success: (m) => show(m, "success"), error: (m) => show(m, "error"), info: (m) => show(m, "info") }),
    [show]
  );

  useEffect(() => {
    globalToast = ctx;
    return () => { globalToast = null; };
  }, [ctx]);

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div
        style={{
          position: "fixed",
          top: 16,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "8px",
          zIndex: 9999,
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} id={t.id} message={t.message} type={t.type} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export default ToastProvider;
