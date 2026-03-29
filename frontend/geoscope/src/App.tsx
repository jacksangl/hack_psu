import { useEffect } from "react";
import { GlobeScene } from "./components/gui/globe/GlobeScene";
import { CountryPanel } from "./components/gui/ui/CountryPanel";
import { TopBar } from "./components/gui/layout/TopBar";
import { BottomBar } from "./components/gui/layout/BottomBar";
import { LoadingOverlay } from "./components/gui/ui/LoadingOverlay";
import { useGlobalSentiment } from "./hooks/useGlobalSentiment";

function SentimentLoader() {
  useGlobalSentiment();
  return null;
}

export default function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <div className="w-full h-full relative">
      <LoadingOverlay />
      <SentimentLoader />
      <GlobeScene />
      <TopBar />
      <BottomBar />
      <CountryPanel />
    </div>
  );
}
