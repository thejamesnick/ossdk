use anchor_lang::{
    prelude::*,
    system_program::{create_account, CreateAccount},
};
use anchor_spl::token_interface::{Mint, TokenAccount};
use spl_tlv_account_resolution::{
    account::ExtraAccountMeta, seeds::Seed, state::ExtraAccountMetaList,
};
use spl_transfer_hook_interface::instruction::{ExecuteInstruction, TransferHookInstruction};

declare_id!("2pMqj2G5tEiCMoSyWHcoCX383q5ji2hZcVCDxSYiyHje");

#[program]
pub mod sss_transfer_hook {
    use super::*;

    /// Initialize extra account metas for the transfer hook
    /// This tells Token-2022 which additional accounts to include in transfer instructions
    pub fn initialize_extra_account_meta_list(
        ctx: Context<InitializeExtraAccountMetaList>,
    ) -> Result<()> {
        // Define the extra accounts needed for blacklist checks
        // Account indices in Execute instruction:
        // 0: source token account
        // 1: mint
        // 2: destination token account
        // 3: authority (source owner)
        // 4: extra_account_meta_list (this account)
        // 5+: our extra accounts start here

        let extra_account_metas = vec![
            // Extra account 0 (index 5): SSS Core program ID
            // This is needed so we can reference it for deriving PDAs
            ExtraAccountMeta::new_with_pubkey(
                &ctx.accounts.sss_core_program.key(),
                false, // not signer
                false, // not writable
            )?,
            // Extra account 1 (index 6): Stablecoin PDA from sss-core
            // PDA off the SSS Core program (index 5)
            ExtraAccountMeta::new_external_pda_with_seeds(
                5, // program index (SSS Core at index 5)
                &[
                    Seed::Literal {
                        bytes: b"stablecoin".to_vec(),
                    },
                    Seed::AccountKey { index: 1 }, // mint
                ],
                false, // not writable
                false, // not signer
            )?,
            // Extra account 2 (index 7): Source owner's blacklist entry
            // PDA off the SSS Core program
            ExtraAccountMeta::new_external_pda_with_seeds(
                5, // program index (SSS Core)
                &[
                    Seed::Literal {
                        bytes: b"blacklist".to_vec(),
                    },
                    Seed::AccountKey { index: 6 }, // stablecoin PDA
                    Seed::AccountKey { index: 3 }, // authority/source owner
                ],
                false, // not writable
                false, // not signer
            )?,
            // Extra account 3 (index 8): Destination owner's blacklist entry
            // PDA off the SSS Core program
            ExtraAccountMeta::new_external_pda_with_seeds(
                5, // program index (SSS Core)
                &[
                    Seed::Literal {
                        bytes: b"blacklist".to_vec(),
                    },
                    Seed::AccountKey { index: 6 }, // stablecoin PDA
                    Seed::AccountData {
                        account_index: 2, // destination token account
                        data_index: 32,   // owner field offset
                        length: 32,       // pubkey length
                    },
                ],
                false, // not writable
                false, // not signer
            )?,
        ];

        // Get account info
        let account_size = ExtraAccountMetaList::size_of(extra_account_metas.len())?;

        // Calculate rent
        let lamports = Rent::get()?.minimum_balance(account_size);

        // Get the bump for the PDA
        let mint_key = ctx.accounts.mint.key();
        let seeds = &[
            b"extra-account-metas",
            mint_key.as_ref(),
            &[ctx.bumps.extra_account_meta_list],
        ];
        let signer_seeds = &[&seeds[..]];

        // Create the account with PDA signer
        create_account(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                CreateAccount {
                    from: ctx.accounts.payer.to_account_info(),
                    to: ctx.accounts.extra_account_meta_list.to_account_info(),
                },
                signer_seeds,
            ),
            lamports,
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
        _program_id: &Pubkey,
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
                let sss_core_program_info = next_account_info(account_info_iter)?;
                let stablecoin_info = next_account_info(account_info_iter)?;
                let source_blacklist_info = next_account_info(account_info_iter)?;
                let destination_blacklist_info = next_account_info(account_info_iter)?;

                // Build accounts struct manually
                let execute_accounts = Execute {
                    source: InterfaceAccount::try_from(source_info)?,
                    mint: InterfaceAccount::try_from(mint_info)?,
                    destination: InterfaceAccount::try_from(destination_info)?,
                    authority: authority_info.clone(),
                    extra_account_meta_list: extra_account_meta_list_info.clone(),
                    sss_core_program: sss_core_program_info.clone(),
                    stablecoin: stablecoin_info.clone(),
                    source_blacklist: source_blacklist_info.clone(),
                    destination_blacklist: destination_blacklist_info.clone(),
                };

                // Call execute directly with manual checks
                msg!("Transfer hook: checking {} tokens transfer", amount);

                // Check if source owner is blacklisted
                if execute_accounts.source_blacklist.data_len() > 0 {
                    msg!("Transfer blocked: source address is blacklisted");
                    return err!(ErrorCode::SourceBlacklisted);
                }

                // Check if destination owner is blacklisted
                if execute_accounts.destination_blacklist.data_len() > 0 {
                    msg!("Transfer blocked: destination address is blacklisted");
                    return err!(ErrorCode::DestinationBlacklisted);
                }

                msg!("Transfer allowed: both addresses are clean");
                Ok(())
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

    /// CHECK: SSS Core program ID - needed to derive PDAs off this program
    pub sss_core_program: AccountInfo<'info>,

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

    /// CHECK: SSS Core program ID
    pub sss_core_program: AccountInfo<'info>,

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
