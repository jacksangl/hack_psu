import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { useGlobalSentiment } from "./data/news/hooks/useGlobalSentiment";
import { GalaxyBackground } from "./ui/gui/background/GalaxyBackground";
import { GlobeScene } from "./ui/gui/globe/GlobeScene";
import { BottomBar } from "./ui/gui/layout/BottomBar";
import { TopBar } from "./ui/gui/layout/TopBar";
import { CountryPanel } from "./ui/gui/ui/CountryPanel";
import { GlobeTooltip } from "./ui/gui/ui/GlobeTooltip";
import { ArticleNavBridge } from "./ui/gui/ui/ArticleNavBridge";
import { NewsHomePage } from "./pages/NewsHomePage";
import { ArticleComparisonPage } from "./pages/ArticleComparisonPage";

function SentimentLoader() {
  useGlobalSentiment();
  return null;
}

function GlobeView() {
  return (
    <div className="w-full h-full relative bg-[#030712]">
      <GalaxyBackground />
      <SentimentLoader />
      <GlobeScene />
      <GlobeTooltip />
      <ArticleNavBridge />
      <BottomBar />
      <CountryPanel />
    </div>
  );
}

export default function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <div className="w-full h-full relative">
      <TopBar />
      <Routes>
        <Route path="/" element={<NewsHomePage />} />
        <Route path="/globe" element={<GlobeView />} />
        <Route path="/article/:encodedUrl" element={<ArticleComparisonPage />} />
      </Routes>
    </div>
  );
}
