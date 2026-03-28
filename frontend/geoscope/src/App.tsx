import { useEffect } from "react";
import { GlobeScene } from "./components/Globe/GlobeScene";
import { CountryPanel } from "./components/UI/CountryPanel";
import { TopBar } from "./components/Layout/TopBar";
import { BottomBar } from "./components/Layout/BottomBar";
import { LoadingOverlay } from "./components/UI/LoadingOverlay";
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
