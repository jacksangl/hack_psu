import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const MESSAGES = [
  "Getting sources for you",
  "Scanning news outlets",
  "Cross-referencing stories",
  "Analyzing coverage",
];

export function SourcesLoader({ label }: { label?: string }) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 2400);
    return () => clearInterval(interval);
  }, []);

  const displayMessage = label || MESSAGES[messageIndex];

  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <div className="relative w-10 h-10">
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-accent-teal/30"
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className="w-5 h-5 rounded-full border-2 border-accent-teal border-t-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key={displayMessage}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.3 }}
          className="font-data text-xs uppercase tracking-wider text-slate-400"
        >
          {displayMessage}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
