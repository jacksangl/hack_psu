import { useEffect } from "react";
import { useGlobalSentiment } from "./data/news/hooks/useGlobalSentiment";
import { GalaxyBackground } from "./ui/gui/background/GalaxyBackground";
import { GlobeScene } from "./ui/gui/globe/GlobeScene";
import { BottomBar } from "./ui/gui/layout/BottomBar";
import { TopBar } from "./ui/gui/layout/TopBar";
import { CountryPanel } from "./ui/gui/ui/CountryPanel";
import { LoadingOverlay } from "./ui/gui/ui/LoadingOverlay";

function SentimentLoader() {
  useGlobalSentiment();
  return null;
}

export default function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <div className="w-full h-full relative bg-[#030712]">
      <GalaxyBackground />
      <LoadingOverlay />
      <SentimentLoader />
      <GlobeScene />
      <TopBar />
      <BottomBar />
      <CountryPanel />
    </div>
  );
}
