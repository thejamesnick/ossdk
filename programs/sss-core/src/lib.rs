use anchor_lang::prelude::*;
use anchor_spl::token_2022::{
    self, Burn, FreezeAccount, Mint, MintTo, ThawAccount, Token2022, TokenAccount,
};

declare_id!("SSS1Core11111111111111111111111111111111111");

#[program]
pub mod sss_core {
    use super::*;

    /// Initialize a new stablecoin with configurable features
    pub fn initialize(ctx: Context<Initialize>, config: StablecoinConfig) -> Result<()> {
        let stablecoin = &mut ctx.accounts.stablecoin;

        stablecoin.authority = ctx.accounts.authority.key();
        stablecoin.mint = ctx.accounts.mint.key();
        stablecoin.name = config.name;
        stablecoin.symbol = config.symbol;
        stablecoin.uri = config.uri;
        stablecoin.decimals = config.decimals;

        // SSS-2 compliance features
        stablecoin.enable_permanent_delegate = config.enable_permanent_delegate;
        stablecoin.enable_transfer_hook = config.enable_transfer_hook;
        stablecoin.default_account_frozen = config.default_account_frozen;

        stablecoin.is_paused = false;
        stablecoin.total_minted = 0;
        stablecoin.total_burned = 0;
        stablecoin.bump = ctx.bumps.stablecoin;

        emit!(StablecoinInitialized {
            stablecoin: stablecoin.key(),
            mint: stablecoin.mint,
            authority: stablecoin.authority,
            name: stablecoin.name.clone(),
            symbol: stablecoin.symbol.clone(),
        });

        Ok(())
    }

    /// Mint tokens (requires minter role)
    pub fn mint(ctx: Context<MintTokens>, amount: u64) -> Result<()> {
        let stablecoin = &ctx.accounts.stablecoin;
        require!(!stablecoin.is_paused, ErrorCode::ContractPaused);

        // Check minter role and quota
        let minter_account = &mut ctx.accounts.minter_account;
        require!(minter_account.is_active, ErrorCode::MinterInactive);
        require!(
            minter_account.minted_amount + amount <= minter_account.quota,
            ErrorCode::QuotaExceeded
        );

        // Update minter stats
        minter_account.minted_amount += amount;

        // Mint tokens
        let seeds = &[b"stablecoin", stablecoin.mint.as_ref(), &[stablecoin.bump]];
        let signer = &[&seeds[..]];

        token_2022::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.recipient_token_account.to_account_info(),
                    authority: ctx.accounts.stablecoin.to_account_info(),
                },
                signer,
            ),
            amount,
        )?;

        emit!(TokensMinted {
            stablecoin: stablecoin.key(),
            recipient: ctx.accounts.recipient_token_account.key(),
            minter: ctx.accounts.minter.key(),
            amount,
        });

        Ok(())
    }

    /// Burn tokens
    pub fn burn(ctx: Context<BurnTokens>, amount: u64) -> Result<()> {
        let stablecoin = &ctx.accounts.stablecoin;
        require!(!stablecoin.is_paused, ErrorCode::ContractPaused);

        token_2022::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.mint.to_account_info(),
                    from: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
        )?;

        emit!(TokensBurned {
            stablecoin: stablecoin.key(),
            user: ctx.accounts.user.key(),
            amount,
        });

        Ok(())
    }

    /// Freeze account (requires freeze authority)
    pub fn freeze_account(ctx: Context<FreezeAccountCtx>) -> Result<()> {
        let stablecoin = &ctx.accounts.stablecoin;

        let seeds = &[b"stablecoin", stablecoin.mint.as_ref(), &[stablecoin.bump]];
        let signer = &[&seeds[..]];

        token_2022::freeze_account(CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            FreezeAccount {
                account: ctx.accounts.target_token_account.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                authority: ctx.accounts.stablecoin.to_account_info(),
            },
            signer,
        ))?;

        emit!(AccountFrozen {
            stablecoin: stablecoin.key(),
            account: ctx.accounts.target_token_account.key(),
        });

        Ok(())
    }

    /// Thaw account (requires freeze authority)
    pub fn thaw_account(ctx: Context<ThawAccountCtx>) -> Result<()> {
        let stablecoin = &ctx.accounts.stablecoin;

        let seeds = &[b"stablecoin", stablecoin.mint.as_ref(), &[stablecoin.bump]];
        let signer = &[&seeds[..]];

        token_2022::thaw_account(CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            ThawAccount {
                account: ctx.accounts.target_token_account.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                authority: ctx.accounts.stablecoin.to_account_info(),
            },
            signer,
        ))?;

        emit!(AccountThawed {
            stablecoin: stablecoin.key(),
            account: ctx.accounts.target_token_account.key(),
        });

        Ok(())
    }

    /// Pause all operations (emergency)
    pub fn pause(ctx: Context<Pause>) -> Result<()> {
        let stablecoin = &mut ctx.accounts.stablecoin;
        stablecoin.is_paused = true;

        emit!(StablecoinPaused {
            stablecoin: stablecoin.key(),
        });

        Ok(())
    }

    /// Unpause operations
    pub fn unpause(ctx: Context<Unpause>) -> Result<()> {
        let stablecoin = &mut ctx.accounts.stablecoin;
        stablecoin.is_paused = false;

        emit!(StablecoinUnpaused {
            stablecoin: stablecoin.key(),
        });

        Ok(())
    }

    /// Add or update minter
    pub fn update_minter(ctx: Context<UpdateMinter>, quota: u64, is_active: bool) -> Result<()> {
        let minter_account = &mut ctx.accounts.minter_account;
        minter_account.stablecoin = ctx.accounts.stablecoin.key();
        minter_account.minter = ctx.accounts.minter.key();
        minter_account.quota = quota;
        minter_account.is_active = is_active;
        minter_account.minted_amount = 0;
        minter_account.bump = ctx.bumps.minter_account;

        emit!(MinterUpdated {
            stablecoin: ctx.accounts.stablecoin.key(),
            minter: ctx.accounts.minter.key(),
            quota,
            is_active,
        });

        Ok(())
    }

    /// Transfer authority to new address
    pub fn transfer_authority(
        ctx: Context<TransferAuthority>,
        new_authority: Pubkey,
    ) -> Result<()> {
        let stablecoin = &mut ctx.accounts.stablecoin;
        let old_authority = stablecoin.authority;
        stablecoin.authority = new_authority;

        emit!(AuthorityTransferred {
            stablecoin: stablecoin.key(),
            old_authority,
            new_authority,
        });

        Ok(())
    }

    /// Add address to blacklist (SSS-2 only)
    pub fn add_to_blacklist(ctx: Context<AddToBlacklist>, reason: String) -> Result<()> {
        let stablecoin = &ctx.accounts.stablecoin;
        require!(
            stablecoin.enable_transfer_hook,
            ErrorCode::ComplianceNotEnabled
        );

        let blacklist_entry = &mut ctx.accounts.blacklist_entry;
        blacklist_entry.stablecoin = stablecoin.key();
        blacklist_entry.address = ctx.accounts.target_address.key();
        blacklist_entry.reason = reason.clone();
        blacklist_entry.timestamp = Clock::get()?.unix_timestamp;
        blacklist_entry.bump = ctx.bumps.blacklist_entry;

        emit!(AddressBlacklisted {
            stablecoin: stablecoin.key(),
            address: ctx.accounts.target_address.key(),
            reason,
        });

        Ok(())
    }

    /// Remove address from blacklist (SSS-2 only)
    pub fn remove_from_blacklist(ctx: Context<RemoveFromBlacklist>) -> Result<()> {
        let stablecoin = &ctx.accounts.stablecoin;
        require!(
            stablecoin.enable_transfer_hook,
            ErrorCode::ComplianceNotEnabled
        );

        emit!(AddressUnblacklisted {
            stablecoin: stablecoin.key(),
            address: ctx.accounts.blacklist_entry.address,
        });

        Ok(())
    }
}

// Account Structures

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct StablecoinConfig {
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub decimals: u8,
    pub enable_permanent_delegate: bool,
    pub enable_transfer_hook: bool,
    pub default_account_frozen: bool,
}

#[account]
pub struct Stablecoin {
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub decimals: u8,
    pub enable_permanent_delegate: bool,
    pub enable_transfer_hook: bool,
    pub default_account_frozen: bool,
    pub is_paused: bool,
    pub total_minted: u64,
    pub total_burned: u64,
    pub bump: u8,
}

impl Stablecoin {
    pub const LEN: usize =
        8 + 32 + 32 + (4 + 32) + (4 + 10) + (4 + 100) + 1 + 1 + 1 + 1 + 1 + 8 + 8 + 1;
}

#[account]
pub struct MinterAccount {
    pub stablecoin: Pubkey,
    pub minter: Pubkey,
    pub quota: u64,
    pub minted_amount: u64,
    pub is_active: bool,
    pub bump: u8,
}

impl MinterAccount {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 1 + 1;
}

#[account]
pub struct BlacklistEntry {
    pub stablecoin: Pubkey,
    pub address: Pubkey,
    pub reason: String,
    pub timestamp: i64,
    pub bump: u8,
}

impl BlacklistEntry {
    pub const LEN: usize = 8 + 32 + 32 + (4 + 200) + 8 + 1;
}

// Context Structures

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = Stablecoin::LEN,
        seeds = [b"stablecoin", mint.key().as_ref()],
        bump
    )]
    pub stablecoin: Account<'info, Stablecoin>,
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MintTokens<'info> {
    #[account(
        seeds = [b"stablecoin", mint.key().as_ref()],
        bump = stablecoin.bump
    )]
    pub stablecoin: Account<'info, Stablecoin>,
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub recipient_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [b"minter", stablecoin.key().as_ref(), minter.key().as_ref()],
        bump = minter_account.bump
    )]
    pub minter_account: Account<'info, MinterAccount>,
    pub minter: Signer<'info>,
    pub token_program: Program<'info, Token2022>,
}

#[derive(Accounts)]
pub struct BurnTokens<'info> {
    #[account(
        seeds = [b"stablecoin", mint.key().as_ref()],
        bump = stablecoin.bump
    )]
    pub stablecoin: Account<'info, Stablecoin>,
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token2022>,
}

#[derive(Accounts)]
pub struct FreezeAccountCtx<'info> {
    #[account(
        seeds = [b"stablecoin", mint.key().as_ref()],
        bump = stablecoin.bump,
        has_one = authority
    )]
    pub stablecoin: Account<'info, Stablecoin>,
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub target_token_account: Account<'info, TokenAccount>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token2022>,
}

#[derive(Accounts)]
pub struct ThawAccountCtx<'info> {
    #[account(
        seeds = [b"stablecoin", mint.key().as_ref()],
        bump = stablecoin.bump,
        has_one = authority
    )]
    pub stablecoin: Account<'info, Stablecoin>,
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub target_token_account: Account<'info, TokenAccount>,
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token2022>,
}

#[derive(Accounts)]
pub struct Pause<'info> {
    #[account(
        mut,
        seeds = [b"stablecoin", stablecoin.mint.as_ref()],
        bump = stablecoin.bump,
        has_one = authority
    )]
    pub stablecoin: Account<'info, Stablecoin>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct Unpause<'info> {
    #[account(
        mut,
        seeds = [b"stablecoin", stablecoin.mint.as_ref()],
        bump = stablecoin.bump,
        has_one = authority
    )]
    pub stablecoin: Account<'info, Stablecoin>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateMinter<'info> {
    #[account(
        seeds = [b"stablecoin", stablecoin.mint.as_ref()],
        bump = stablecoin.bump,
        has_one = authority
    )]
    pub stablecoin: Account<'info, Stablecoin>,
    #[account(
        init_if_needed,
        payer = authority,
        space = MinterAccount::LEN,
        seeds = [b"minter", stablecoin.key().as_ref(), minter.key().as_ref()],
        bump
    )]
    pub minter_account: Account<'info, MinterAccount>,
    /// CHECK: Minter address
    pub minter: AccountInfo<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TransferAuthority<'info> {
    #[account(
        mut,
        seeds = [b"stablecoin", stablecoin.mint.as_ref()],
        bump = stablecoin.bump,
        has_one = authority
    )]
    pub stablecoin: Account<'info, Stablecoin>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct AddToBlacklist<'info> {
    #[account(
        seeds = [b"stablecoin", stablecoin.mint.as_ref()],
        bump = stablecoin.bump,
        has_one = authority
    )]
    pub stablecoin: Account<'info, Stablecoin>,
    #[account(
        init,
        payer = authority,
        space = BlacklistEntry::LEN,
        seeds = [b"blacklist", stablecoin.key().as_ref(), target_address.key().as_ref()],
        bump
    )]
    pub blacklist_entry: Account<'info, BlacklistEntry>,
    /// CHECK: Target address to blacklist
    pub target_address: AccountInfo<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RemoveFromBlacklist<'info> {
    #[account(
        seeds = [b"stablecoin", stablecoin.mint.as_ref()],
        bump = stablecoin.bump,
        has_one = authority
    )]
    pub stablecoin: Account<'info, Stablecoin>,
    #[account(
        mut,
        close = authority,
        seeds = [b"blacklist", stablecoin.key().as_ref(), blacklist_entry.address.as_ref()],
        bump = blacklist_entry.bump
    )]
    pub blacklist_entry: Account<'info, BlacklistEntry>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

// Events

#[event]
pub struct StablecoinInitialized {
    pub stablecoin: Pubkey,
    pub mint: Pubkey,
    pub authority: Pubkey,
    pub name: String,
    pub symbol: String,
}

#[event]
pub struct TokensMinted {
    pub stablecoin: Pubkey,
    pub recipient: Pubkey,
    pub minter: Pubkey,
    pub amount: u64,
}

#[event]
pub struct TokensBurned {
    pub stablecoin: Pubkey,
    pub user: Pubkey,
    pub amount: u64,
}

#[event]
pub struct AccountFrozen {
    pub stablecoin: Pubkey,
    pub account: Pubkey,
}

#[event]
pub struct AccountThawed {
    pub stablecoin: Pubkey,
    pub account: Pubkey,
}

#[event]
pub struct StablecoinPaused {
    pub stablecoin: Pubkey,
}

#[event]
pub struct StablecoinUnpaused {
    pub stablecoin: Pubkey,
}

#[event]
pub struct MinterUpdated {
    pub stablecoin: Pubkey,
    pub minter: Pubkey,
    pub quota: u64,
    pub is_active: bool,
}

#[event]
pub struct AuthorityTransferred {
    pub stablecoin: Pubkey,
    pub old_authority: Pubkey,
    pub new_authority: Pubkey,
}

#[event]
pub struct AddressBlacklisted {
    pub stablecoin: Pubkey,
    pub address: Pubkey,
    pub reason: String,
}

#[event]
pub struct AddressUnblacklisted {
    pub stablecoin: Pubkey,
    pub address: Pubkey,
}

// Error Codes

#[error_code]
pub enum ErrorCode {
    #[msg("Contract is paused")]
    ContractPaused,
    #[msg("Minter is not active")]
    MinterInactive,
    #[msg("Minter quota exceeded")]
    QuotaExceeded,
    #[msg("Compliance module not enabled")]
    ComplianceNotEnabled,
    #[msg("Unauthorized")]
    Unauthorized,
}
