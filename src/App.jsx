import { useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import ExceptionsTrigger from "./pages/ExceptionsTrigger";
import PrExplanations from "./pages/PrExplanations";
import SettingsPanel from "./components/SettingsPanel";
import "./App.css";

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">Self-Healing Pipeline Dashboard</div>
        <nav className="nav">
          <NavLink to="/" end>
            Trigger Exceptions
          </NavLink>
          <NavLink to="/explanations">PR Explanations</NavLink>
        </nav>
        <button className="settings-toggle" onClick={() => setSettingsOpen((v) => !v)}>
          Settings
        </button>
      </header>

      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}

      <main className="content">
        <Routes>
          <Route path="/" element={<ExceptionsTrigger />} />
          <Route path="/explanations" element={<PrExplanations />} />
        </Routes>
      </main>
    </div>
  );
}
