require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  networks: {
    hardhat: {
      // This is the built-in local blockchain Hardhat spins up automatically.
      // 20 test accounts are pre-funded with fake ETH for testing.
    },
    localhost: {
      // Used when you run `npx hardhat node` in one terminal
      // and deploy/connect from another terminal or MetaMask.
      url: "http://127.0.0.1:8545",
    },
  },
};
