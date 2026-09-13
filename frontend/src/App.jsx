import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useWallet } from "./hooks/useWallet";
import Header from "./components/Header";
import ProjectsList from "./pages/ProjectsList";
import SubmitProject from "./pages/SubmitProject";
import Dashboard from "./pages/Dashboard";
import Marketplace from "./pages/Marketplace";

export default function App() {
  const { account, contract, isCorrectNetwork, connect, switchToHardhatNetwork, error } = useWallet();
  return (
    <BrowserRouter>
      <div style={{ minHeight: "100vh", background: "#0f0f18", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
        <Header account={account} isCorrectNetwork={isCorrectNetwork} connect={connect} switchToHardhatNetwork={switchToHardhatNetwork} error={error} />
        <Routes>
          <Route path="/" element={<ProjectsList account={account} contract={contract} isCorrectNetwork={isCorrectNetwork} />} />
          <Route path="/submit" element={<SubmitProject account={account} contract={contract} isCorrectNetwork={isCorrectNetwork} />} />
          <Route path="/dashboard" element={<Dashboard account={account} contract={contract} isCorrectNetwork={isCorrectNetwork} />} />
          <Route path="/marketplace" element={<Marketplace account={account} contract={contract} isCorrectNetwork={isCorrectNetwork} />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
