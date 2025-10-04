use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke;
use anchor_lang::solana_program::system_instruction;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

// Program ID - This would be replaced with actual deployed program ID
declare_id!("3AVRxMyR7ci4LiYbLKKG8zKisfaSNiDF9WqdYP65kkhF");

/**
 * Reward Vault Program
 * 
 * This Solana program manages reward distribution for the Pump Pill Arena platform.
 * It handles both SOL and SPL token rewards with secure vault management and
 * automated distribution capabilities.
 * 
 * Key Features:
 * - Secure vault initialization and management
 * - Epoch-based reward periods
 * - Both SOL and SPL token support
 * - Automated reward distribution
 * - Comprehensive error handling and validation
 * - Event emission for off-chain tracking
 */
#[program]
pub mod reward_vault {
    use super::*;

    /**
     * Initialize a new reward vault
     * 
     * Creates a new vault account that will hold rewards for distribution.
     * The vault can be configured to distribute either SOL or SPL tokens.
     * 
     * @param ctx - Context containing vault initialization accounts
     * @param distributor - Public key of the authorized distributor
     * @param reward_mint - Optional SPL token mint (required if not paying SOL)
     * @param pay_sol - Whether to pay rewards in SOL or SPL tokens
     */
    pub fn init_vault(
        ctx: Context<InitVault>,
        distributor: Pubkey,
        reward_mint: Option<Pubkey>,
        pay_sol: bool,
    ) -> Result<()> {
        // Validate that either SOL payment is enabled or SPL mint is provided
        require!(pay_sol || reward_mint.is_some(), RewardVaultError::RewardMintRequired);

        let reward_vault = &mut ctx.accounts.reward_vault;
        
        // Initialize vault with provided parameters
        reward_vault.admin = ctx.accounts.admin.key();
        reward_vault.distributor = distributor;
        reward_vault.reward_mint = reward_mint;
        reward_vault.pay_sol = pay_sol;
        reward_vault.bump = ctx.bumps.reward_vault;

        Ok(())
    }

    /**
     * Start a new reward epoch
     * 
     * Creates a new epoch account that tracks reward distribution for a specific
     * time period. Epochs allow for organized reward cycles and tracking.
     * 
     * @param ctx - Context containing epoch initialization accounts
     * @param start_ts - Unix timestamp for epoch start
     * @param end_ts - Unix timestamp for epoch end
     * @param index - Sequential epoch index number
     */
    pub fn start_epoch(
        ctx: Context<StartEpoch>,
        start_ts: i64,
        end_ts: i64,
        index: u64,
    ) -> Result<()> {
        // Validate epoch time window
        require!(start_ts < end_ts, RewardVaultError::InvalidEpochWindow);

        let epoch = &mut ctx.accounts.epoch;
        
        // Initialize epoch with provided parameters
        epoch.vault = ctx.accounts.reward_vault.key();
        epoch.start_ts = start_ts;
        epoch.end_ts = end_ts;
        epoch.index = index;
        epoch.total_funded = 0;
        epoch.bump = ctx.bumps.epoch;

        // Emit event for off-chain tracking
        emit!(NewEpoch {
            start_ts,
            end_ts,
            epoch_index: index,
        });

        Ok(())
    }

    /**
     * Fund the reward vault
     * 
     * Adds funds to the vault for distribution. Supports both SOL and SPL tokens.
     * Updates epoch tracking if an active epoch is provided.
     * 
     * @param ctx - Context containing funding accounts
     * @param amount - Amount to fund in lamports or token units
     */
    pub fn fund_vault(ctx: Context<FundVault>, amount: u64) -> Result<()> {
        require!(amount > 0, RewardVaultError::InvalidAmount);

        let reward_vault = &ctx.accounts.reward_vault;

        // Route funding based on vault configuration
        if reward_vault.pay_sol {
            fund_sol(&ctx, amount)?;
        } else {
            fund_spl(&ctx, amount)?;
        }

        // Update epoch tracking if provided
        if let Some(epoch) = ctx.accounts.epoch.as_mut() {
            require_keys_eq!(epoch.vault, reward_vault.key(), RewardVaultError::EpochMismatch);
            
            // Safely add to total funded with overflow protection
            epoch.total_funded = epoch
                .total_funded
                .checked_add(amount as u128)
                .ok_or(RewardVaultError::ArithmeticOverflow)?;
        }

        Ok(())
    }

    /**
     * Disburse SOL rewards
     * 
     * Distributes SOL from the vault to a recipient. Only authorized distributors
     * can call this function, and the vault must be configured for SOL payments.
     * 
     * @param ctx - Context containing disbursement accounts
     * @param amount - Amount to disburse in lamports
     */
    pub fn disburse_sol(ctx: Context<DisburseSol>, amount: u64) -> Result<()> {
        require!(amount > 0, RewardVaultError::InvalidAmount);
        require!(ctx.accounts.reward_vault.pay_sol, RewardVaultError::WrongPayoutMode);

        let distributor = &ctx.accounts.distributor_signer;
        
        // Verify distributor authorization
        require_keys_eq!(distributor.key(), ctx.accounts.reward_vault.distributor, RewardVaultError::UnauthorizedDistributor);
        require!(distributor.is_signer, RewardVaultError::MissingDistributorSignature);

        pay_out_sol(&ctx, amount)
    }

    /**
     * Disburse SPL token rewards
     * 
     * Distributes SPL tokens from the vault to a recipient. Only authorized
     * distributors can call this function, and the vault must be configured
     * for SPL token payments.
     * 
     * @param ctx - Context containing disbursement accounts
     * @param amount - Amount to disburse in token units
     */
    pub fn disburse_spl(ctx: Context<DisburseSpl>, amount: u64) -> Result<()> {
        require!(amount > 0, RewardVaultError::InvalidAmount);
        require!(!ctx.accounts.reward_vault.pay_sol, RewardVaultError::WrongPayoutMode);

        let distributor = &ctx.accounts.distributor_signer;
        
        // Verify distributor authorization
        require_keys_eq!(distributor.key(), ctx.accounts.reward_vault.distributor, RewardVaultError::UnauthorizedDistributor);
        require!(distributor.is_signer, RewardVaultError::MissingDistributorSignature);

        pay_out_spl(&ctx, amount)
    }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Fund vault with SOL
 * 
 * Transfers SOL from funder to vault using system program instruction.
 * This is a low-level function that handles the actual SOL transfer.
 */
fn fund_sol(ctx: &Context<FundVault>, amount: u64) -> Result<()> {
    let funder = ctx.accounts.funder.to_account_info();
    let reward_vault_info = ctx.accounts.reward_vault.to_account_info();
    let system_program = ctx.accounts.system_program.to_account_info();

    // Create and invoke system transfer instruction
    let transfer_ix = system_instruction::transfer(funder.key, reward_vault_info.key, amount);
    invoke(&transfer_ix, &[funder, reward_vault_info, system_program])?;

    Ok(())
}

/**
 * Fund vault with SPL tokens
 * 
 * Transfers SPL tokens from funder to vault using token program.
 * Validates mint addresses and handles token account transfers.
 */
fn fund_spl(ctx: &Context<FundVault>, amount: u64) -> Result<()> {
    let reward_vault = &ctx.accounts.reward_vault;
    let reward_mint = reward_vault
        .reward_mint
        .ok_or(RewardVaultError::RewardMintRequired)?;

    let vault_token = ctx
        .accounts
        .vault_token_account
        .as_ref()
        .ok_or(RewardVaultError::VaultTokenRequired)?;

    let funder_token = ctx
        .accounts
        .funder_token_account
        .as_ref()
        .ok_or(RewardVaultError::FunderTokenRequired)?;

    // Validate mint addresses match
    require_keys_eq!(vault_token.mint, reward_mint, RewardVaultError::MintMismatch);
    require_keys_eq!(funder_token.mint, reward_mint, RewardVaultError::MintMismatch);

    let token_program = ctx.accounts.token_program.to_account_info();

    // Create token transfer instruction
    let cpi_accounts = Transfer {
        from: funder_token.to_account_info(),
        to: vault_token.to_account_info(),
        authority: ctx.accounts.funder.to_account_info(),
    };

    // Execute token transfer
    token::transfer(CpiContext::new(token_program, cpi_accounts), amount)?;

    Ok(())
}

/**
 * Pay out SOL from vault
 * 
 * Directly transfers SOL from vault to recipient by modifying lamports.
 * This is a low-level operation that bypasses the system program.
 */
fn pay_out_sol(ctx: &Context<DisburseSol>, amount: u64) -> Result<()> {
    let reward_vault_info = ctx.accounts.reward_vault.to_account_info();
    let recipient_info = ctx.accounts.recipient.to_account_info();

    // Check vault has sufficient balance
    let balance = reward_vault_info.lamports();
    require!(balance >= amount, RewardVaultError::InsufficientVaultBalance);

    // Transfer lamports directly
    **reward_vault_info.try_borrow_mut_lamports()? -= amount;
    **recipient_info.try_borrow_mut_lamports()? += amount;

    Ok(())
}

/**
 * Pay out SPL tokens from vault
 * 
 * Transfers SPL tokens from vault to recipient using token program.
 * Uses program-derived address for vault authority.
 */
fn pay_out_spl(ctx: &Context<DisburseSpl>, amount: u64) -> Result<()> {
    let reward_vault = &ctx.accounts.reward_vault;
    let reward_mint = reward_vault
        .reward_mint
        .ok_or(RewardVaultError::RewardMintRequired)?;

    let vault_token = &ctx.accounts.vault_token_account;
    let recipient_token = &ctx.accounts.recipient_token_account;

    // Validate mint addresses
    require_keys_eq!(vault_token.mint, reward_mint, RewardVaultError::MintMismatch);
    require_keys_eq!(recipient_token.mint, reward_mint, RewardVaultError::MintMismatch);

    let token_program = ctx.accounts.token_program.to_account_info();

    // Create program-derived address for vault authority
    let seeds: [&[u8]; 3] = [RewardVault::SEED, reward_vault.admin.as_ref(), &[reward_vault.bump]];
    let signer = &[&seeds[..]];

    // Create token transfer instruction with program authority
    let cpi_accounts = Transfer {
        from: vault_token.to_account_info(),
        to: recipient_token.to_account_info(),
        authority: reward_vault.to_account_info(),
    };

    // Execute token transfer with program signature
    token::transfer(CpiContext::new_with_signer(token_program, cpi_accounts, signer), amount)?;

    Ok(())
}

// ============================================================================
// ACCOUNT STRUCTURES
// ============================================================================

/**
 * Initialize Vault Context
 * 
 * Accounts required for vault initialization including admin signer,
 * vault account creation, and system program.
 */
#[derive(Accounts)]
pub struct InitVault<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init,
        payer = admin,
        space = RewardVault::LEN,
        seeds = [RewardVault::SEED, admin.key().as_ref()],
        bump
    )]
    pub reward_vault: Account<'info, RewardVault>,
    pub system_program: Program<'info, System>,
}

/**
 * Start Epoch Context
 * 
 * Accounts required for epoch initialization including admin signer,
 * vault account, epoch account creation, and system program.
 */
#[derive(Accounts)]
pub struct StartEpoch<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        mut,
        has_one = admin,
        seeds = [RewardVault::SEED, reward_vault.admin.as_ref()],
        bump = reward_vault.bump
    )]
    pub reward_vault: Account<'info, RewardVault>,
    #[account(
        init,
        payer = admin,
        space = Epoch::LEN,
        seeds = [Epoch::SEED, reward_vault.key().as_ref()],
        bump
    )]
    pub epoch: Account<'info, Epoch>,
    pub system_program: Program<'info, System>,
}

/**
 * Fund Vault Context
 * 
 * Accounts required for vault funding including vault account,
 * funder signer, optional epoch tracking, and token accounts.
 */
#[derive(Accounts)]
pub struct FundVault<'info> {
    #[account(
        mut,
        seeds = [RewardVault::SEED, reward_vault.admin.as_ref()],
        bump = reward_vault.bump
    )]
    pub reward_vault: Account<'info, RewardVault>,
    #[account(mut)]
    pub funder: Signer<'info>,
    #[account(mut)]
    pub epoch: Option<Account<'info, Epoch>>,
    #[account(mut)]
    pub funder_token_account: Option<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub vault_token_account: Option<Account<'info, TokenAccount>>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

/**
 * Disburse SOL Context
 * 
 * Accounts required for SOL disbursement including vault account,
 * distributor signer, recipient account, and system program.
 */
#[derive(Accounts)]
pub struct DisburseSol<'info> {
    #[account(
        mut,
        seeds = [RewardVault::SEED, reward_vault.admin.as_ref()],
        bump = reward_vault.bump
    )]
    pub reward_vault: Account<'info, RewardVault>,
    /// CHECK: verified as signer against stored distributor key
    pub distributor_signer: AccountInfo<'info>,
    #[account(mut)]
    pub recipient: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

/**
 * Disburse SPL Context
 * 
 * Accounts required for SPL token disbursement including vault account,
 * distributor signer, token accounts, and token program.
 */
#[derive(Accounts)]
pub struct DisburseSpl<'info> {
    #[account(
        mut,
        seeds = [RewardVault::SEED, reward_vault.admin.as_ref()],
        bump = reward_vault.bump
    )]
    pub reward_vault: Account<'info, RewardVault>,
    /// CHECK: verified as signer against stored distributor key
    pub distributor_signer: AccountInfo<'info>,
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub recipient_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

// ============================================================================
// DATA STRUCTURES
// ============================================================================

/**
 * Reward Vault Account
 * 
 * Stores configuration and state for a reward vault including
 * admin authority, distributor authorization, and payment mode.
 */
#[account]
pub struct RewardVault {
    pub admin: Pubkey,              // Admin authority for vault management
    pub distributor: Pubkey,        // Authorized distributor for rewards
    pub reward_mint: Option<Pubkey>, // SPL token mint (if not SOL)
    pub pay_sol: bool,              // Whether to pay in SOL or SPL tokens
    pub bump: u8,                   // Bump seed for PDA
}

impl RewardVault {
    pub const SEED: &'static [u8] = b"reward_vault";
    pub const LEN: usize = 8 + 32 + 32 + 33 + 1 + 1; // Discriminator + fields
}

/**
 * Epoch Account
 * 
 * Tracks reward distribution for a specific time period including
 * time boundaries, funding totals, and sequential indexing.
 */
#[account]
pub struct Epoch {
    pub vault: Pubkey,        // Associated vault account
    pub start_ts: i64,        // Epoch start timestamp
    pub end_ts: i64,          // Epoch end timestamp
    pub index: u64,           // Sequential epoch number
    pub total_funded: u128,   // Total amount funded for this epoch
    pub bump: u8,             // Bump seed for PDA
}

impl Epoch {
    pub const SEED: &'static [u8] = b"epoch";
    pub const LEN: usize = 8 + 32 + 8 + 8 + 8 + 16 + 1; // Discriminator + fields
}

// ============================================================================
// EVENTS
// ============================================================================

/**
 * New Epoch Event
 * 
 * Emitted when a new epoch is started, providing off-chain systems
 * with epoch information for tracking and processing.
 */
#[event]
pub struct NewEpoch {
    pub start_ts: i64,      // Epoch start timestamp
    pub end_ts: i64,        // Epoch end timestamp
    pub epoch_index: u64,   // Sequential epoch number
}

// ============================================================================
// ERROR CODES
// ============================================================================

/**
 * Reward Vault Error Codes
 * 
 * Comprehensive error handling for all possible failure modes
 * in the reward vault program with descriptive error messages.
 */
#[error_code]
pub enum RewardVaultError {
    #[msg("Reward mint is required when not paying SOL")]
    RewardMintRequired,
    #[msg("Invalid epoch window")]
    InvalidEpochWindow,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Epoch account does not match vault")]
    EpochMismatch,
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
    #[msg("Vault token account required")]
    VaultTokenRequired,
    #[msg("Funder token account required")]
    FunderTokenRequired,
    #[msg("Reward mint mismatch")]
    MintMismatch,
    #[msg("Missing bump in context")]
    BumpNotFound,
    #[msg("Unauthorized distributor")]
    UnauthorizedDistributor,
    #[msg("Distributor must sign disbursements")]
    MissingDistributorSignature,
    #[msg("Insufficient vault balance")]
    InsufficientVaultBalance,
    #[msg("Wrong payout mode for this instruction")]
    WrongPayoutMode,
}
