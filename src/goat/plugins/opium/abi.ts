import { parseAbi } from "viem";

export const ERC20_ABI = parseAbi([
    "function transfer(address to, uint256 amount) external returns (bool)",
    "function balanceOf(address account) external view returns (uint256)",
    "function totalSupply() external view returns (uint256)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function transferFrom(address from, address to, uint256 amount) external returns (bool)",
]);

export const FAUCET_ABI = parseAbi([
    "function claim() external",
]);

export const ARBITRAGE_ABI = parseAbi([
    "function create(bytes memory data) external",
]);
