// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ClinicToken (CLT)
 * @notice ERC-20 utility token for ClinicTrust AI B2B healthcare platform.
 *         Providers earn CLT for referrals, KYC, analytics contributions, etc.
 *         CLT can be redeemed for premium platform services.
 *
 * Supply model:
 *   - Hard cap: 1,000,000 CLT (set at deploy time via constructor)
 *   - Owner can mint up to the cap; no inflation beyond cap
 *   - Holders can burn their own tokens (irreversible deflation)
 *   - Ownership transferable for future DAO governance
 */
contract ClinicToken is ERC20Capped, ERC20Burnable, Ownable {
    // ── Events ────────────────────────────────────────────────────────────────

    event TokensMinted(address indexed to, uint256 amount, string reason);
    event TokensBurned(address indexed from, uint256 amount, string reason);

    // ── Constructor ───────────────────────────────────────────────────────────

    /**
     * @param cap_ Maximum token supply in smallest unit (1 CLT = 1e18 units)
     */
    constructor(uint256 cap_) ERC20("ClinicToken", "CLT") ERC20Capped(cap_) Ownable(msg.sender) {}

    // ── Minting ───────────────────────────────────────────────────────────────

    /**
     * @notice Mint tokens to a provider wallet. Only callable by owner (platform backend).
     * @param to     Recipient wallet address
     * @param amount Amount in smallest unit (1 CLT = 1e18)
     * @param reason Human-readable earn reason for on-chain audit
     */
    function mint(address to, uint256 amount, string calldata reason) external onlyOwner {
        _mint(to, amount);
        emit TokensMinted(to, amount, reason);
    }

    /**
     * @notice Burn tokens from a specific address (admin-initiated). Requires allowance.
     * @param from   Token holder address
     * @param amount Amount to burn
     * @param reason Reason for admin burn
     */
    function adminBurn(address from, uint256 amount, string calldata reason) external onlyOwner {
        _spendAllowance(from, msg.sender, amount);
        _burn(from, amount);
        emit TokensBurned(from, amount, reason);
    }

    // ── Override required by Solidity (ERC20Capped + ERC20 both define _update) ──

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Capped)
    {
        super._update(from, to, value);
    }
}
