import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useWallet } from "./hooks/useWallet";
import Sidebar from "./components/Sidebar";
import Landing from "./pages/Landing";
import ProjectsList from "./pages/ProjectsList";
import SubmitProject from "./pages/SubmitProject";
import Dashboard from "./pages/Dashboard";
import Marketplace from "./pages/Marketplace";
import Explorer from "./pages/Explorer";

import ErrorBoundary from "./components/ErrorBoundary";

function AppShell() {
  const { account, contract, isCorrectNetwork, connect, switchToHardhatNetwork, error } = useWallet();
  const location = useLocation();

  if (location.pathname === "/") {
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
      </Routes>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-main)", color: "var(--text-primary)" }}>
      <Sidebar
        account={account}
        isCorrectNetwork={isCorrectNetwork}
        connect={connect}
        switchToHardhatNetwork={switchToHardhatNetwork}
        error={error}
      />
      <main style={{ flex: 1, minWidth: 0 }}>
        <ErrorBoundary>
          <Routes>
            <Route path="/projects" element={<ProjectsList account={account} contract={contract} isCorrectNetwork={isCorrectNetwork} />} />
            <Route path="/submit" element={<SubmitProject account={account} contract={contract} isCorrectNetwork={isCorrectNetwork} />} />
            <Route path="/marketplace" element={<Marketplace account={account} contract={contract} isCorrectNetwork={isCorrectNetwork} />} />
            <Route path="/explorer" element={<Explorer account={account} contract={contract} isCorrectNetwork={isCorrectNetwork} />} />
            <Route path="/dashboard" element={<Dashboard account={account} contract={contract} isCorrectNetwork={isCorrectNetwork} />} />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
