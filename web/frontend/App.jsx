import { Routes, Route } from "react-router-dom";
import { Frame } from "@shopify/polaris";
import { AppNavigation } from "./components/AppNavigation";

// Import your pages
import HomePage from "./pages/index";
import Carriers from "./pages/carriers";

export default function App() {
  return (
    <Frame navigation={<AppNavigation />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/carriers" element={<Carriers />} />
      </Routes>
    </Frame>
  );
}