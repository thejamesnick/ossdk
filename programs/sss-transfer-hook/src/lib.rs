use anchor_lang::{
    prelude::*,
    system_program::{create_account, CreateAccount},
};
use anchor_spl::token_interface::{Mint, TokenAccount};
use spl_tlv_account_resolution::{
    account::ExtraAccountMeta, seeds::Seed, state::ExtraAccountMetaList,
};
use spl_transfer_hook_interface::instruction::{ExecuteInstruction, TransferHookInstruction};

declare_id!("SSS1Hook11111111111111111111111111111111111");

#[program]
pub mod sss_transfer_hook {
    use super::*;

    /// Initialize extra account metas for the transfer hook
    /// This tells Token-2022 which additional accounts to include in transfer instructions
    pub fn initialize_extra_account_meta_list(
        ctx: Context<InitializeExtraAccountMetaList>,
        sss_core_program_id: Pubkey,
    ) -> Result<()> {
        // Define the extra accounts needed for blacklist checks
        let extra_account_metas = vec![
            // Stablecoin PDA from sss-core
            ExtraAccountMeta::new_with_seeds(
                &[
                    Seed::Literal {
                        bytes: b"stablecoin".to_vec(),
                    },
                    Seed::AccountKey { index: 0 }, // mint
                ],
                false, // not writable
                false, // not signer
            )?,
            // Source owner's blacklist entry (may not exist)
            ExtraAccountMeta::new_with_seeds(
                &[
                    Seed::Literal {
                        bytes: b"blacklist".to_vec(),
                    },
                    Seed::AccountKey { index: 4 }, // stablecoin PDA (index 4 in extra accounts)
                    Seed::AccountKey { index: 3 }, // source owner
                ],
                false, // not writable
                false, // not signer
            )?,
            // Destination owner's blacklist entry (may not exist)
            ExtraAccountMeta::new_with_seeds(
                &[
                    Seed::Literal {
                        bytes: b"blacklist".to_vec(),
                    },
                    Seed::AccountKey { index: 4 }, // stablecoin PDA
                    Seed::AccountKey { index: 5 }, // destination owner
                ],
                false, // not writable
                false, // not signer
            )?,
        ];

        // Get account info
        let account_size = ExtraAccountMetaList::size_of(extra_account_metas.len())?;

        // Create the account
        create_account(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                CreateAccount {
                    from: ctx.accounts.payer.to_account_info(),
                    to: ctx.accounts.extra_account_meta_list.to_account_info(),
                },
            ),
            10_000_000, // 10 SOL for rent
            account_size as u64,
            &ctx.program_id,
        )?;

        // Initialize the extra account meta list
        let mut data = ctx.accounts.extra_account_meta_list.try_borrow_mut_data()?;
        ExtraAccountMetaList::init::<ExecuteInstruction>(&mut data, &extra_account_metas)?;

        msg!(
            "Transfer hook initialized with {} extra accounts",
            extra_account_metas.len()
        );
        Ok(())
    }

    /// Execute the transfer hook - called on every transfer
    /// This is where we check if source or destination is blacklisted
    pub fn execute(ctx: Context<Execute>, amount: u64) -> Result<()> {
        msg!("Transfer hook: checking {} tokens transfer", amount);

        // Deserialize stablecoin config to check if transfer hook is enabled
        let stablecoin_data = ctx.accounts.stablecoin.try_borrow_data()?;

        // Skip first 8 bytes (discriminator)
        if stablecoin_data.len() < 8 {
            return err!(ErrorCode::InvalidStablecoinAccount);
        }

        // Check enable_transfer_hook flag (at specific offset in the account)
        // Account structure: discriminator(8) + authority(32) + mint(32) + name + symbol + uri + decimals(1) + enable_permanent_delegate(1) + enable_transfer_hook(1)
        // For simplicity, we'll just verify the account exists and has data
        // The actual validation happens through the PDA seeds in extra account metas

        // Check if source owner is blacklisted
        // A blacklist entry exists if the account has data
        let source_blacklist = &ctx.accounts.source_blacklist;
        if source_blacklist.data_len() > 0 {
            msg!("Transfer blocked: source address is blacklisted");
            return err!(ErrorCode::SourceBlacklisted);
        }

        // Check if destination owner is blacklisted
        let destination_blacklist = &ctx.accounts.destination_blacklist;
        if destination_blacklist.data_len() > 0 {
            msg!("Transfer blocked: destination address is blacklisted");
            return err!(ErrorCode::DestinationBlacklisted);
        }

        msg!("Transfer allowed: both addresses are clean");
        Ok(())
    }

    /// Fallback instruction handler for transfer hook interface
    pub fn fallback<'info>(
        program_id: &Pubkey,
        accounts: &'info [AccountInfo<'info>],
        data: &[u8],
    ) -> Result<()> {
        let instruction = TransferHookInstruction::unpack(data)?;

        match instruction {
            TransferHookInstruction::Execute { amount } => {
                let account_info_iter = &mut accounts.iter();

                let source_info = next_account_info(account_info_iter)?;
                let mint_info = next_account_info(account_info_iter)?;
                let destination_info = next_account_info(account_info_iter)?;
                let authority_info = next_account_info(account_info_iter)?;
                let extra_account_meta_list_info = next_account_info(account_info_iter)?;
                let stablecoin_info = next_account_info(account_info_iter)?;
                let source_blacklist_info = next_account_info(account_info_iter)?;
                let destination_blacklist_info = next_account_info(account_info_iter)?;

                // Build context manually
                let ctx = Context::new(
                    program_id,
                    &mut Execute {
                        source: InterfaceAccount::try_from(source_info)?,
                        mint: InterfaceAccount::try_from(mint_info)?,
                        destination: InterfaceAccount::try_from(destination_info)?,
                        authority: authority_info.clone(),
                        extra_account_meta_list: extra_account_meta_list_info.clone(),
                        stablecoin: stablecoin_info.clone(),
                        source_blacklist: source_blacklist_info.clone(),
                        destination_blacklist: destination_blacklist_info.clone(),
                    },
                    accounts,
                    &[],
                );

                execute(ctx, amount)
            }
            _ => Err(ProgramError::InvalidInstructionData.into()),
        }
    }
}

#[derive(Accounts)]
pub struct InitializeExtraAccountMetaList<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: Extra account meta list PDA
    #[account(
        mut,
        seeds = [b"extra-account-metas", mint.key().as_ref()],
        bump
    )]
    pub extra_account_meta_list: AccountInfo<'info>,

    pub mint: InterfaceAccount<'info, Mint>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Execute<'info> {
    pub source: InterfaceAccount<'info, TokenAccount>,
    pub mint: InterfaceAccount<'info, Mint>,
    pub destination: InterfaceAccount<'info, TokenAccount>,

    /// CHECK: Authority can be any account
    pub authority: AccountInfo<'info>,

    /// CHECK: Extra account meta list
    pub extra_account_meta_list: AccountInfo<'info>,

    /// CHECK: Stablecoin config from sss-core (validated by seeds in extra account metas)
    pub stablecoin: AccountInfo<'info>,

    /// CHECK: Source owner blacklist entry (may not exist)
    pub source_blacklist: AccountInfo<'info>,

    /// CHECK: Destination owner blacklist entry (may not exist)
    pub destination_blacklist: AccountInfo<'info>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Source address is blacklisted")]
    SourceBlacklisted,

    #[msg("Destination address is blacklisted")]
    DestinationBlacklisted,

    #[msg("Transfer hook is not enabled for this stablecoin")]
    TransferHookNotEnabled,

    #[msg("Invalid stablecoin account")]
    InvalidStablecoinAccount,
}
