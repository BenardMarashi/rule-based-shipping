import { Navigation } from "@shopify/polaris";
import { HomeIcon, SettingsIcon, ShipmentIcon } from "@shopify/polaris-icons";
import { useLocation, useNavigate } from "react-router-dom";

export function AppNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  // Define navigation items
  const navigationItems = [
    {
      label: "Home",
      icon: HomeIcon,
      url: "/",
      selected: location.pathname === "/",
      onClick: () => navigate("/"),
    },
    {
      label: "Carriers",
      icon: ShipmentIcon,
      url: "/carriers",
      selected: location.pathname === "/carriers",
      onClick: () => navigate("/carriers"),
    },
    {
      label: "Settings",
      icon: SettingsIcon,
      url: "/settings",
      selected: location.pathname === "/settings",
      onClick: () => navigate("/settings"),
    },
  ];

  return <Navigation location={location.pathname} items={navigationItems} />;
}