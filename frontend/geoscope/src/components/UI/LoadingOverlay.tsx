import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function LoadingOverlay() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="loading"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-globe-bg"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center gap-6"
          >
            {/* Animated globe icon */}
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full border-2 border-accent-teal/30 animate-ping" />
              <div className="absolute inset-2 rounded-full border border-accent-teal/50" />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#14b8a6"
                  strokeWidth="1.5"
                >
                  <circle cx="12" cy="12" r="10" />
                  <ellipse cx="12" cy="12" rx="4" ry="10" />
                  <path d="M2 12h20" />
                </svg>
              </div>
            </div>

            <div className="text-center">
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight mb-1">
                GeoScope
              </h1>
              <p className="text-sm text-slate-500">
                Interactive News Intelligence
              </p>
            </div>

            <div className="w-32 h-0.5 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-accent-teal rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 2, ease: "easeInOut" }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
