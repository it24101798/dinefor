import { useEffect, useState } from "react";

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, [query]);
  return matches;
}

export default function useResponsive() {
  return {
    isSmallMobile: useMediaQuery("(max-width: 374px)"),
    isMobile: useMediaQuery("(max-width: 767px)"),
    isLargeMobile: useMediaQuery("(min-width: 375px) and (max-width: 767px)"),
    isTablet: useMediaQuery("(min-width: 768px) and (max-width: 1023px)"),
    isDesktop: useMediaQuery("(min-width: 1024px)"),
    prefersReducedMotion: useMediaQuery("(prefers-reduced-motion: reduce)"),
  };
}
