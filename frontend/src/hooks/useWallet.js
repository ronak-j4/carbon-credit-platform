import { useState, useEffect, useCallback } from "react";
import { BrowserProvider, Contract } from "ethers";
import abi from "../contract/CarbonCreditPlatform.abi.json";
import { CONTRACT_ADDRESS, HARDHAT_CHAIN_ID, HARDHAT_CHAIN_ID_HEX } from "../contract/config";

/**
 * Central hook for wallet connection + contract access.
 *
 * Returns:
 *  - account: the currently connected address, or null
 *  - contract: an ethers Contract instance wired to the connected signer,
 *    ready to call write functions (submitProject, approveProject, etc.)
 *  - isCorrectNetwork: true only if MetaMask is on the Hardhat local chain
 *  - connect(): triggers the MetaMask connect popup
 *  - error: a human-readable error string, if anything went wrong
 */
export function useWallet() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [error, setError] = useState(null);

  const setupContract = useCallback(async () => {
    if (!window.ethereum) {
      setError("MetaMask not detected. Please install the MetaMask browser extension.");
      return;
    }
    try {
      const provider = new BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();

      if (network.chainId !== HARDHAT_CHAIN_ID) {
        setIsCorrectNetwork(false);
        setError(
          `Wrong network. Please switch MetaMask to "Hardhat Local" (chain ID 31337). Currently on chain ID ${network.chainId}.`
        );
        setContract(null);
        return;
      }
      setIsCorrectNetwork(true);
      setError(null);

      const accounts = await provider.send("eth_accounts", []);
      if (accounts.length === 0) {
        setAccount(null);
        setContract(null);
        return;
      }

      const signer = await provider.getSigner();
      setAccount(accounts[0]);
      setContract(new Contract(CONTRACT_ADDRESS, abi, signer));
    } catch (err) {
      setError(err.message || "Failed to connect to wallet.");
    }
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError("MetaMask not detected. Please install the MetaMask browser extension.");
      return;
    }
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      await setupContract();
    } catch (err) {
      // Error code 4001 = user rejected the connection request
      if (err.code === 4001) {
        setError("Connection request was rejected.");
      } else {
        setError(err.message || "Failed to connect.");
      }
    }
  }, [setupContract]);

  const switchToHardhatNetwork = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: HARDHAT_CHAIN_ID_HEX }],
      });
      await setupContract();
    } catch (err) {
      setError(err.message || "Failed to switch network.");
    }
  }, [setupContract]);

  useEffect(() => {
    setupContract();

    if (window.ethereum) {
      // Re-run setup whenever the user switches accounts or networks in MetaMask
      window.ethereum.on("accountsChanged", setupContract);
      window.ethereum.on("chainChanged", setupContract);
      return () => {
        window.ethereum.removeListener("accountsChanged", setupContract);
        window.ethereum.removeListener("chainChanged", setupContract);
      };
    }
  }, [setupContract]);

  return { account, contract, isCorrectNetwork, connect, switchToHardhatNetwork, error };
}
