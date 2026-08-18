import React from "react";
import useResponsive from "../../hooks/useResponsive";
import DesktopBuffetCard from "./DesktopBuffetCard";
import MobileBuffetCard from "./MobileBuffetCard";
import "./buffet-card.css";

export default function BuffetCard({
  buffet,
  className = "",
  mobileVariant = "compact",
}) {
  const { isMobile } = useResponsive();

  if (isMobile && mobileVariant === "compact") {
    return <MobileBuffetCard buffet={buffet} className={className} />;
  }

  return <DesktopBuffetCard buffet={buffet} className={className} />;
}
