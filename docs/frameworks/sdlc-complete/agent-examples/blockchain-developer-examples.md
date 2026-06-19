# Blockchain Developer — Worked Examples

Externalized from the agent definition per the few-shot-examples rule (#1587).

## Your Process

### 1. ERC-20 Token Implementation

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";

/// @title GovernanceToken
/// @notice ERC-20 with gasless permits (EIP-2612) and on-chain voting delegation
contract GovernanceToken is ERC20, ERC20Permit, ERC20Votes, Ownable2Step {
    uint256 public constant MAX_SUPPLY = 1_000_000_000e18; // 1 billion tokens

    error ExceedsMaxSupply(uint256 requested, uint256 available);

    constructor(address initialOwner)
        ERC20("Governance Token", "GOV")
        ERC20Permit("Governance Token")
        Ownable(initialOwner)
    {}

    /// @notice Mint tokens; owner-only, capped at MAX_SUPPLY
    function mint(address to, uint256 amount) external onlyOwner {
        uint256 available = MAX_SUPPLY - totalSupply();
        if (amount > available) revert ExceedsMaxSupply(amount, available);
        _mint(to, amount);
    }

    // Required overrides for ERC20Votes
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Votes)
    {
        super._update(from, to, value);
    }

    function nonces(address owner)
        public
        view
        override(ERC20Permit, Nonces)
        returns (uint256)
    {
        return super.nonces(owner);
    }
}
```

### 2. ERC-721 NFT with Royalties and Allowlist

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721A} from "erc721a/contracts/ERC721A.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title NFTCollection
/// @notice Gas-efficient NFT collection using ERC721A with merkle allowlist and EIP-2981 royalties
contract NFTCollection is ERC721A, ERC2981, Ownable2Step, ReentrancyGuard {
    using Strings for uint256;

    uint256 public constant MAX_SUPPLY = 10_000;
    uint256 public constant ALLOWLIST_PRICE = 0.05 ether;
    uint256 public constant PUBLIC_PRICE = 0.08 ether;
    uint256 public constant MAX_PER_WALLET = 5;

    bytes32 public merkleRoot;
    string private _baseTokenURI;
    string private _unrevealedURI;

    bool public revealed;
    bool public allowlistActive;
    bool public publicActive;

    mapping(address => uint256) public allowlistMinted;

    event Revealed(string baseURI);
    event MerkleRootUpdated(bytes32 newRoot);

    error InvalidProof();
    error AllowlistNotActive();
    error PublicNotActive();
    error ExceedsMaxSupply();
    error ExceedsWalletLimit();
    error InsufficientPayment(uint256 sent, uint256 required);
    error WithdrawFailed();

    constructor(
        address initialOwner,
        bytes32 _merkleRoot,
        string memory unrevealedURI,
        address royaltyReceiver
    ) ERC721A("NFT Collection", "NFTC") Ownable(initialOwner) {
        merkleRoot = _merkleRoot;
        _unrevealedURI = unrevealedURI;
        _setDefaultRoyalty(royaltyReceiver, 500); // 5% royalty
    }

    /// @notice Mint for allowlisted addresses
    function allowlistMint(uint256 quantity, bytes32[] calldata proof)
        external
        payable
        nonReentrant
    {
        if (!allowlistActive) revert AllowlistNotActive();
        if (_totalMinted() + quantity > MAX_SUPPLY) revert ExceedsMaxSupply();
        if (allowlistMinted[msg.sender] + quantity > MAX_PER_WALLET) revert ExceedsWalletLimit();

        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        if (!MerkleProof.verifyCalldata(proof, merkleRoot, leaf)) revert InvalidProof();

        uint256 cost = ALLOWLIST_PRICE * quantity;
        if (msg.value < cost) revert InsufficientPayment(msg.value, cost);

        allowlistMinted[msg.sender] += quantity;
        _mint(msg.sender, quantity);

        // Refund overpayment
        if (msg.value > cost) {
            (bool ok,) = msg.sender.call{value: msg.value - cost}("");
            require(ok);
        }
    }

    /// @notice Public mint
    function publicMint(uint256 quantity) external payable nonReentrant {
        if (!publicActive) revert PublicNotActive();
        if (_totalMinted() + quantity > MAX_SUPPLY) revert ExceedsMaxSupply();

        uint256 cost = PUBLIC_PRICE * quantity;
        if (msg.value < cost) revert InsufficientPayment(msg.value, cost);

        _mint(msg.sender, quantity);

        if (msg.value > cost) {
            (bool ok,) = msg.sender.call{value: msg.value - cost}("");
            require(ok);
        }
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        if (!_exists(tokenId)) revert URIQueryForNonexistentToken();
        if (!revealed) return _unrevealedURI;
        return string(abi.encodePacked(_baseTokenURI, tokenId.toString(), ".json"));
    }

    // Admin functions
    function reveal(string calldata baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
        revealed = true;
        emit Revealed(baseURI);
    }

    function setMerkleRoot(bytes32 newRoot) external onlyOwner {
        merkleRoot = newRoot;
        emit MerkleRootUpdated(newRoot);
    }

    function toggleAllowlist() external onlyOwner { allowlistActive = !allowlistActive; }
    function togglePublic() external onlyOwner { publicActive = !publicActive; }

    function withdraw() external onlyOwner nonReentrant {
        (bool ok,) = owner().call{value: address(this).balance}("");
        if (!ok) revert WithdrawFailed();
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721A, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
```

### 3. Foundry Test Suite with Fuzzing

```solidity
// test/NFTCollection.t.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {NFTCollection} from "../src/NFTCollection.sol";
import {Merkle} from "murky/Merkle.sol";

contract NFTCollectionTest is Test {
    NFTCollection nft;
    Merkle merkle;
    address owner = makeAddr("owner");
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address royaltyReceiver = makeAddr("royalty");

    bytes32 merkleRoot;
    bytes32[] aliceProof;

    function setUp() public {
        merkle = new Merkle();

        // Build allowlist merkle tree
        bytes32[] memory leaves = new bytes32[](2);
        leaves[0] = keccak256(abi.encodePacked(alice));
        leaves[1] = keccak256(abi.encodePacked(bob));
        merkleRoot = merkle.getRoot(leaves);
        aliceProof = merkle.getProof(leaves, 0);

        vm.prank(owner);
        nft = new NFTCollection(owner, merkleRoot, "ipfs://unrevealed", royaltyReceiver);

        // Fund test addresses
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
    }

    function test_AllowlistMint() public {
        vm.prank(owner);
        nft.toggleAllowlist();

        vm.prank(alice);
        nft.allowlistMint{value: 0.05 ether}(1, aliceProof);

        assertEq(nft.balanceOf(alice), 1);
        assertEq(nft.allowlistMinted(alice), 1);
    }

    function test_RevertWhen_InvalidMerkleProof() public {
        vm.prank(owner);
        nft.toggleAllowlist();

        address attacker = makeAddr("attacker");
        vm.deal(attacker, 1 ether);

        vm.prank(attacker);
        vm.expectRevert(NFTCollection.InvalidProof.selector);
        nft.allowlistMint{value: 0.05 ether}(1, aliceProof);
    }

    function test_RevertWhen_AllowlistNotActive() public {
        vm.prank(alice);
        vm.expectRevert(NFTCollection.AllowlistNotActive.selector);
        nft.allowlistMint{value: 0.05 ether}(1, aliceProof);
    }

    function test_RevealChangesTokenURI() public {
        vm.prank(owner);
        nft.toggleAllowlist();
        vm.prank(alice);
        nft.allowlistMint{value: 0.05 ether}(1, aliceProof);

        assertEq(nft.tokenURI(0), "ipfs://unrevealed");

        vm.prank(owner);
        nft.reveal("ipfs://QmRevealedHash/");

        assertEq(nft.tokenURI(0), "ipfs://QmRevealedHash/0.json");
    }

    // Fuzz: any valid quantity within limits should mint successfully
    function testFuzz_PublicMintQuantity(uint8 quantity) public {
        quantity = uint8(bound(quantity, 1, 5));
        uint256 cost = 0.08 ether * quantity;
        vm.deal(alice, cost);

        vm.prank(owner);
        nft.togglePublic();

        vm.prank(alice);
        nft.publicMint{value: cost}(quantity);

        assertEq(nft.balanceOf(alice), quantity);
    }

    // Invariant: total supply never exceeds MAX_SUPPLY
    function invariant_TotalSupplyNeverExceedsMax() public view {
        assertLe(nft.totalSupply(), nft.MAX_SUPPLY());
    }
}
```

```javascript
// Hardhat test suite (for teams preferring JavaScript toolchain)
// test/GovernanceToken.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("GovernanceToken", function () {
  async function deployFixture() {
    const [owner, alice, bob] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("GovernanceToken");
    const token = await Token.deploy(owner.address);
    return { token, owner, alice, bob };
  }

  it("mints up to MAX_SUPPLY", async function () {
    const { token, owner, alice } = await loadFixture(deployFixture);
    const MAX_SUPPLY = await token.MAX_SUPPLY();

    await token.connect(owner).mint(alice.address, MAX_SUPPLY);
    expect(await token.totalSupply()).to.equal(MAX_SUPPLY);
  });

  it("reverts when minting beyond MAX_SUPPLY", async function () {
    const { token, owner, alice } = await loadFixture(deployFixture);
    const MAX_SUPPLY = await token.MAX_SUPPLY();

    await token.connect(owner).mint(alice.address, MAX_SUPPLY);

    await expect(
      token.connect(owner).mint(alice.address, 1n)
    ).to.be.revertedWithCustomError(token, "ExceedsMaxSupply");
  });

  it("supports EIP-2612 permit", async function () {
    const { token, owner, alice, bob } = await loadFixture(deployFixture);
    await token.connect(owner).mint(alice.address, ethers.parseEther("1000"));

    const amount = ethers.parseEther("100");
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const nonce = await token.nonces(alice.address);

    const domain = {
      name: "Governance Token",
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await token.getAddress(),
    };

    const types = {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };

    const signature = await alice.signTypedData(domain, types, {
      owner: alice.address,
      spender: bob.address,
      value: amount,
      nonce,
      deadline,
    });
    const { v, r, s } = ethers.Signature.from(signature);

    await token.permit(alice.address, bob.address, amount, deadline, v, r, s);
    expect(await token.allowance(alice.address, bob.address)).to.equal(amount);
  });
});
```

### 4. Security Auditing Patterns

**Reentrancy — Checks-Effects-Interactions**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SecureVault is ReentrancyGuard {
    mapping(address => uint256) public balances;

    // VULNERABLE pattern — DO NOT USE
    function withdraw_UNSAFE(uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        // External call happens BEFORE state update — attacker can re-enter
        (bool ok,) = msg.sender.call{value: amount}("");
        require(ok, "Transfer failed");
        balances[msg.sender] -= amount; // Too late: attacker already re-entered here
    }

    // SECURE pattern: CEI + ReentrancyGuard
    function withdraw(uint256 amount) external nonReentrant {
        if (balances[msg.sender] < amount) revert InsufficientBalance(amount);
        // Check (already done) → Effect → Interaction
        balances[msg.sender] -= amount;  // State updated FIRST
        (bool ok,) = msg.sender.call{value: amount}("");
        require(ok, "Transfer failed");
    }

    // Pull-over-push: safer than pushing funds to arbitrary addresses
    function claimReward() external nonReentrant {
        uint256 reward = pendingRewards[msg.sender];
        if (reward == 0) revert NothingToClaim();
        pendingRewards[msg.sender] = 0;  // Zero before transfer
        (bool ok,) = msg.sender.call{value: reward}("");
        require(ok);
    }

    mapping(address => uint256) public pendingRewards;

    error InsufficientBalance(uint256 requested);
    error NothingToClaim();
}
```

**Front-running and MEV Mitigation**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Commit-reveal scheme prevents front-running on sensitive operations
contract CommitRevealAuction {
    struct Commitment {
        bytes32 hash;
        uint256 deposit;
        uint256 revealDeadline;
    }

    mapping(address => Commitment) public commitments;
    uint256 public constant COMMIT_PERIOD = 1 days;
    uint256 public constant REVEAL_PERIOD = 1 days;
    uint256 public immutable auctionStart;

    error TooEarlyToReveal();
    error CommitmentMismatch();
    error RevealWindowClosed();

    constructor() { auctionStart = block.timestamp; }

    /// @notice Step 1: commit a hash of (bid, salt) — no one can see your bid
    function commit(bytes32 commitHash) external payable {
        require(block.timestamp < auctionStart + COMMIT_PERIOD, "Commit period over");
        commitments[msg.sender] = Commitment({
            hash: commitHash,
            deposit: msg.value,
            revealDeadline: auctionStart + COMMIT_PERIOD + REVEAL_PERIOD,
        });
    }

    /// @notice Step 2: reveal bid with salt — verified against commitment
    function reveal(uint256 bidAmount, bytes32 salt) external {
        Commitment memory c = commitments[msg.sender];
        if (block.timestamp < auctionStart + COMMIT_PERIOD) revert TooEarlyToReveal();
        if (block.timestamp > c.revealDeadline) revert RevealWindowClosed();

        bytes32 expected = keccak256(abi.encodePacked(msg.sender, bidAmount, salt));
        if (expected != c.hash) revert CommitmentMismatch();

        // Process verified bid
        _processBid(msg.sender, bidAmount);
    }

    function _processBid(address bidder, uint256 amount) internal { /* ... */ }
}

/// @notice Slippage protection for DEX interactions prevents sandwich attacks
interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;  // Slippage guard
        uint160 sqrtPriceLimitX96;
    }
    function exactInputSingle(ExactInputSingleParams calldata) external payable returns (uint256);
}

function swapWithSlippageProtection(
    address tokenIn,
    address tokenOut,
    uint256 amountIn,
    uint256 maxSlippageBps  // e.g., 50 = 0.5%
) internal returns (uint256 amountOut) {
    uint256 quotedOut = _getQuote(tokenIn, tokenOut, amountIn);
    uint256 minAmountOut = quotedOut * (10_000 - maxSlippageBps) / 10_000;

    amountOut = ISwapRouter(SWAP_ROUTER).exactInputSingle(
        ISwapRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: 3000,
            recipient: address(this),
            amountIn: amountIn,
            amountOutMinimum: minAmountOut,  // Reverts if sandwich drops price too far
            sqrtPriceLimitX96: 0,
        })
    );
}
```

### 5. Rust Smart Contract on Solana (Anchor)

```rust
// programs/staking/src/lib.rs
// Solana staking program using Anchor framework

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("Stake11111111111111111111111111111111111111");

#[program]
pub mod staking {
    use super::*;

    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        reward_rate_per_second: u64,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        pool.authority = ctx.accounts.authority.key();
        pool.stake_mint = ctx.accounts.stake_mint.key();
        pool.reward_mint = ctx.accounts.reward_mint.key();
        pool.reward_rate = reward_rate_per_second;
        pool.total_staked = 0;
        pool.last_update_time = Clock::get()?.unix_timestamp as u64;
        pool.reward_per_token_stored = 0;
        Ok(())
    }

    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
        require!(amount > 0, StakingError::ZeroAmount);

        let pool = &mut ctx.accounts.pool;
        let user_stake = &mut ctx.accounts.user_stake;
        let now = Clock::get()?.unix_timestamp as u64;

        // Update global reward accumulator
        pool.update_reward_per_token(now);

        // Settle pending rewards for this user before changing their stake
        let pending = user_stake.pending_rewards(pool.reward_per_token_stored);
        user_stake.rewards_earned = user_stake.rewards_earned
            .checked_add(pending)
            .ok_or(StakingError::ArithmeticOverflow)?;
        user_stake.reward_debt = pool.reward_per_token_stored;

        // Transfer tokens from user to pool vault
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, amount)?;

        // Update state
        user_stake.amount = user_stake.amount
            .checked_add(amount)
            .ok_or(StakingError::ArithmeticOverflow)?;
        pool.total_staked = pool.total_staked
            .checked_add(amount)
            .ok_or(StakingError::ArithmeticOverflow)?;

        emit!(StakeEvent {
            user: ctx.accounts.user.key(),
            amount,
            total_staked: pool.total_staked,
        });

        Ok(())
    }

    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        let user_stake = &mut ctx.accounts.user_stake;
        let now = Clock::get()?.unix_timestamp as u64;

        pool.update_reward_per_token(now);

        let pending = user_stake.pending_rewards(pool.reward_per_token_stored);
        let total_claimable = user_stake.rewards_earned
            .checked_add(pending)
            .ok_or(StakingError::ArithmeticOverflow)?;

        require!(total_claimable > 0, StakingError::NoRewardsToClaim);

        user_stake.rewards_earned = 0;
        user_stake.reward_debt = pool.reward_per_token_stored;

        // Transfer rewards from pool authority PDA
        let seeds = &[b"pool", pool.stake_mint.as_ref(), &[pool.bump]];
        let signer = &[&seeds[..]];
        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.reward_vault.to_account_info(),
                to: ctx.accounts.user_reward_account.to_account_info(),
                authority: pool.to_account_info(),
            },
            signer,
        );
        token::transfer(transfer_ctx, total_claimable)?;

        Ok(())
    }
}

#[account]
pub struct Pool {
    pub authority: Pubkey,
    pub stake_mint: Pubkey,
    pub reward_mint: Pubkey,
    pub reward_rate: u64,
    pub total_staked: u64,
    pub last_update_time: u64,
    pub reward_per_token_stored: u128,
    pub bump: u8,
}

impl Pool {
    pub fn update_reward_per_token(&mut self, now: u64) {
        if self.total_staked == 0 {
            self.last_update_time = now;
            return;
        }
        let elapsed = now.saturating_sub(self.last_update_time);
        let new_rewards = (self.reward_rate as u128)
            .saturating_mul(elapsed as u128)
            .saturating_mul(1_000_000_000)  // Precision scaling factor
            / self.total_staked as u128;
        self.reward_per_token_stored = self.reward_per_token_stored.saturating_add(new_rewards);
        self.last_update_time = now;
    }
}

#[account]
pub struct UserStake {
    pub pool: Pubkey,
    pub owner: Pubkey,
    pub amount: u64,
    pub reward_debt: u128,
    pub rewards_earned: u64,
}

impl UserStake {
    pub fn pending_rewards(&self, reward_per_token: u128) -> u64 {
        let earned = (self.amount as u128)
            .saturating_mul(reward_per_token.saturating_sub(self.reward_debt))
            / 1_000_000_000;
        earned as u64
    }
}

#[error_code]
pub enum StakingError {
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
    #[msg("No rewards to claim")]
    NoRewardsToClaim,
}

#[event]
pub struct StakeEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub total_staked: u64,
}
```

### 6. DeFi Integration and L2 Scaling

**DeFi: Uniswap V3 liquidity management**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {INonfungiblePositionManager} from "@uniswap/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol";
import {IUniswapV3Pool} from "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice Manages a single concentrated liquidity position on Uniswap V3
contract LiquidityManager {
    using SafeERC20 for IERC20;

    INonfungiblePositionManager public immutable positionManager;
    address public immutable token0;
    address public immutable token1;
    uint24 public immutable fee;

    uint256 public positionTokenId;

    event LiquidityAdded(uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1);
    event FeesCollected(uint256 amount0, uint256 amount1);

    constructor(
        address _positionManager,
        address _token0,
        address _token1,
        uint24 _fee
    ) {
        positionManager = INonfungiblePositionManager(_positionManager);
        token0 = _token0;
        token1 = _token1;
        fee = _fee;
    }

    /// @notice Provide liquidity in a price range around current price
    function addLiquidity(
        uint256 amount0Desired,
        uint256 amount1Desired,
        int24 tickLower,
        int24 tickUpper
    ) external returns (uint128 liquidity, uint256 amount0, uint256 amount1) {
        IERC20(token0).safeTransferFrom(msg.sender, address(this), amount0Desired);
        IERC20(token1).safeTransferFrom(msg.sender, address(this), amount1Desired);
        IERC20(token0).forceApprove(address(positionManager), amount0Desired);
        IERC20(token1).forceApprove(address(positionManager), amount1Desired);

        if (positionTokenId == 0) {
            // First liquidity: mint new position NFT
            uint256 tokenId;
            (tokenId, liquidity, amount0, amount1) = positionManager.mint(
                INonfungiblePositionManager.MintParams({
                    token0: token0,
                    token1: token1,
                    fee: fee,
                    tickLower: tickLower,
                    tickUpper: tickUpper,
                    amount0Desired: amount0Desired,
                    amount1Desired: amount1Desired,
                    amount0Min: amount0Desired * 99 / 100,  // 1% slippage
                    amount1Min: amount1Desired * 99 / 100,
                    recipient: address(this),
                    deadline: block.timestamp + 15 minutes,
                })
            );
            positionTokenId = tokenId;
            emit LiquidityAdded(tokenId, liquidity, amount0, amount1);
        } else {
            // Subsequent liquidity: increase existing position
            (, liquidity, amount0, amount1) = positionManager.increaseLiquidity(
                INonfungiblePositionManager.IncreaseLiquidityParams({
                    tokenId: positionTokenId,
                    amount0Desired: amount0Desired,
                    amount1Desired: amount1Desired,
                    amount0Min: amount0Desired * 99 / 100,
                    amount1Min: amount1Desired * 99 / 100,
                    deadline: block.timestamp + 15 minutes,
                })
            );
        }

        // Return unused tokens to caller
        _returnExcess(token0, amount0Desired - amount0, msg.sender);
        _returnExcess(token1, amount1Desired - amount1, msg.sender);
    }

    /// @notice Collect accumulated swap fees
    function collectFees() external returns (uint256 amount0, uint256 amount1) {
        (amount0, amount1) = positionManager.collect(
            INonfungiblePositionManager.CollectParams({
                tokenId: positionTokenId,
                recipient: msg.sender,
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max,
            })
        );
        emit FeesCollected(amount0, amount1);
    }

    function _returnExcess(address token, uint256 excess, address to) internal {
        if (excess > 0) IERC20(token).safeTransfer(to, excess);
    }
}
```

**L2 deployment configuration**

```javascript
// hardhat.config.js — multi-network deployment with L2 support
require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,  // Enable IR pipeline for better optimization
    },
  },
  networks: {
    // Optimism Mainnet (OP Stack L2)
    optimism: {
      url: process.env.OPTIMISM_RPC_URL,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY],
      gasPrice: "auto",
    },
    // Arbitrum One (Nitro L2)
    arbitrum: {
      url: process.env.ARBITRUM_RPC_URL,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY],
    },
    // Base (OP Stack L2, Coinbase)
    base: {
      url: process.env.BASE_RPC_URL,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      optimisticEthereum: process.env.OPTIMISTIC_ETHERSCAN_API_KEY,
      arbitrumOne: process.env.ARBISCAN_API_KEY,
      base: process.env.BASESCAN_API_KEY,
    },
    customChains: [
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org",
        },
      },
    ],
  },
};
```

```javascript
// scripts/deploy.js — deploying to multiple L2s with verification
const { ethers, network, run } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying on ${network.name} from ${deployer.address}`);

  // Deploy implementation
  const Token = await ethers.getContractFactory("GovernanceToken");
  const token = await Token.deploy(deployer.address);
  await token.waitForDeployment();

  const address = await token.getAddress();
  console.log(`GovernanceToken deployed: ${address}`);

  // Wait for block confirmations before verifying
  const receipt = await token.deploymentTransaction().wait(5);
  console.log(`Confirmed in block ${receipt.blockNumber}`);

  // Verify on block explorer
  try {
    await run("verify:verify", {
      address,
      constructorArguments: [deployer.address],
    });
    console.log("Contract verified");
  } catch (e) {
    console.warn("Verification failed (may already be verified):", e.message);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
```

### 7. Gas Optimization Patterns

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract GasOptimized {
    // Pack storage variables into a single 32-byte slot (saves ~20,000 gas per slot avoided)
    struct UserInfo {
        uint128 balance;       // 16 bytes
        uint64  lastUpdate;    // 8 bytes
        uint32  rewardDebt;    // 4 bytes
        uint32  lockPeriod;    // 4 bytes — total: 32 bytes = 1 slot
    }
    mapping(address => UserInfo) public userInfo;

    // Cache storage reads to avoid repeated SLOADs (~2,100 gas each)
    function processUsers(address[] calldata users) external {
        uint256 len = users.length;
        for (uint256 i; i < len;) {
            UserInfo memory info = userInfo[users[i]]; // One SLOAD per user
            // Use info.balance, info.lastUpdate multiple times without extra SLOADs
            unchecked { ++i; }  // Safe: i < len prevents overflow
        }
    }

    // Use calldata instead of memory for external params (~3 gas/byte vs ~24 gas/byte)
    function batchMint(address[] calldata recipients, uint256[] calldata amounts) external {
        // calldata is read-only but significantly cheaper for large arrays
    }

    // Custom errors instead of require strings (saves ~50 gas per revert + smaller bytecode)
    error Unauthorized(address caller);
    error InvalidAmount(uint256 amount);

    // Check cheap conditions first: ISZERO is cheaper than SLOAD
    function validate(uint256 amount, address requiredSender) internal view {
        if (amount == 0) revert InvalidAmount(amount);               // ~3 gas
        if (msg.sender != requiredSender) revert Unauthorized(msg.sender); // ~6 gas
    }

    // Bit packing for multiple boolean flags — 1 SLOAD for all flags
    uint256 private _flags;
    uint256 private constant FLAG_INITIALIZED  = 1 << 0;
    uint256 private constant FLAG_PAUSED       = 1 << 1;
    uint256 private constant FLAG_ALLOWLIST    = 1 << 2;

    function isInitialized() public view returns (bool) { return _flags & FLAG_INITIALIZED != 0; }
    function isPaused()      public view returns (bool) { return _flags & FLAG_PAUSED != 0; }
    function isAllowlist()   public view returns (bool) { return _flags & FLAG_ALLOWLIST != 0; }

    function _setFlag(uint256 flag, bool value) internal {
        _flags = value ? (_flags | flag) : (_flags & ~flag);
    }
}
```

## Few-Shot Examples

### Example 1: Smart Contract Security Review

**Prompt**: "Review this ERC-20 token contract before we deploy it."

**Response**:

I found three issues that must be fixed before deployment.

**Critical — Reentrancy in `burn` function**:
```solidity
// VULNERABLE: external call before state update
function burn(uint256 amount) external {
    (bool ok,) = msg.sender.call{value: ethReward(amount)}(""); // Call first
    _burn(msg.sender, amount);  // State update after — attacker can re-enter
}

// FIX: CEI + ReentrancyGuard
function burn(uint256 amount) external nonReentrant {
    uint256 reward = ethReward(amount);
    _burn(msg.sender, amount);  // State first
    (bool ok,) = msg.sender.call{value: reward}("");
    require(ok);
}
```

**High — Missing two-step ownership transfer**: `Ownable` allows transferring to any address immediately. If called with `address(0)` by mistake, owner is permanently lost. Switch to `Ownable2Step`.

**Medium — `approve` frontrunning**: Standard ERC-20 `approve` is vulnerable to the known race condition. Add `increaseAllowance`/`decreaseAllowance` and document the attack in comments.

---

### Example 2: Gas Optimization

**Prompt**: "Our NFT mint function costs 180,000 gas. Can we get it lower?"

**Response**:

180k for a mint is high. Profile first:
```bash
forge test --gas-report --match-test testMint
```

Three likely culprits:

**1 — Storage layout not packed**:
```solidity
// BAD: 3 slots = 3x SSTORE at 20,000 gas each = 60,000 gas
uint256 tokenId; address creator; uint256 mintTimestamp;

// GOOD: 1 slot = 20,000 gas for first SSTORE
struct TokenData {
    uint64 tokenId; address creator; uint32 mintTimestamp;
} // 32 bytes = 1 slot
```

**2 — `_safeMint` calling `onERC721Received`**: Each `_safeMint` adds ~2,300 gas per token for the receiver check. Use `_mint` for contract addresses you control.

**3 — Switch to ERC721A for batch mints**: If users mint 3+ at once, ERC721A amortizes the per-token storage cost from 20,000 gas to ~2,000 gas per additional token.

After packing + ERC721A, expect 100-120k for single mints and 40-50k per token in batches of 5.

---

### Example 3: L2 Deployment Strategy

**Prompt**: "We want to deploy on Ethereum mainnet and also on Base. What changes are needed?"

**Response**:

Base is OP Stack — the same Solidity code deploys without changes. The operational differences are in configuration:

**1 — Gas price**: Base gas is dramatically cheaper than L1. If you have hardcoded gas limits or `gasleft()` guards, review them — they may be overly conservative.

**2 — Block time**: Base produces blocks every ~2 seconds vs 12 seconds on mainnet. If your contracts use `block.number` for time-based logic (vesting, lockups), switch to `block.timestamp` which is consistent across chains.

**3 — Cross-chain token bridging**: Use the Standard Bridge for canonical ETH and ERC-20 bridging. Do not deploy a custom bridge — it's an audit target and the standard bridge is battle-tested.

```javascript
// Deploy to both in one script
for (const [networkName, config] of Object.entries(networks)) {
  const provider = new ethers.JsonRpcProvider(config.rpcUrl);
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const Contract = new ethers.ContractFactory(abi, bytecode, signer);
  const contract = await Contract.deploy(config.constructorArgs);
  await contract.waitForDeployment();
  console.log(`${networkName}: ${await contract.getAddress()}`);
}
```

**4 — Verification**: Submit to both Etherscan and Basescan. Configure both in `hardhat.config.js` under `etherscan.apiKey` — same ABI and source, different explorer API endpoints.
