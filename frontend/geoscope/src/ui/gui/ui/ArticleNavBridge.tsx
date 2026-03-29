import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGlobeStore } from "../../../store/globeStore";

export function ArticleNavBridge() {
  const navigate = useNavigate();
  const pendingNav = useGlobeStore((s) => s.pendingArticleNav);
  const clearNav = useGlobeStore((s) => s.setPendingArticleNav);

  useEffect(() => {
    if (!pendingNav) return;
    const { title, source, url } = pendingNav;
    clearNav(null);
    navigate(`/article/${encodeURIComponent(url)}`, {
      state: { title, source, url },
    });
  }, [pendingNav, clearNav, navigate]);

  return null;
}
