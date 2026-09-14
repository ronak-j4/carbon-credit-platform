import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useWallet } from "./hooks/useWallet";
import Sidebar from "./components/Sidebar";
import ProjectsList from "./pages/ProjectsList";
import SubmitProject from "./pages/SubmitProject";
import Dashboard from "./pages/Dashboard";
import Marketplace from "./pages/Marketplace";

export default function App() {
  const { account, contract, isCorrectNetwork, connect, switchToHardhatNetwork, error } = useWallet();

  return (
    <BrowserRouter>
      <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-main)", color: "var(--text-primary)" }}>
        <Sidebar
          account={account}
          isCorrectNetwork={isCorrectNetwork}
          connect={connect}
          switchToHardhatNetwork={switchToHardhatNetwork}
          error={error}
        />
        <main style={{ flex: 1, minWidth: 0 }}>
          <Routes>
            <Route path="/" element={<ProjectsList account={account} contract={contract} isCorrectNetwork={isCorrectNetwork} />} />
            <Route path="/submit" element={<SubmitProject account={account} contract={contract} isCorrectNetwork={isCorrectNetwork} />} />
            <Route path="/dashboard" element={<Dashboard account={account} contract={contract} isCorrectNetwork={isCorrectNetwork} />} />
            <Route path="/marketplace" element={<Marketplace account={account} contract={contract} isCorrectNetwork={isCorrectNetwork} />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
