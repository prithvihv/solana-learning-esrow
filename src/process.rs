use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    program_pack::{IsInitialized, Pack},
    pubkey::Pubkey,
    sysvar::{rent::Rent, Sysvar},
};

use crate::{error::EscrowError, instruction::EscrowInstruction, state::Escrow};
use spl_token::state::Account as TokenAccount;

pub struct Processor;
impl Processor {
    pub fn process(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        instruction_data: &[u8],
    ) -> ProgramResult {
        let instruction = EscrowInstruction::unpack(instruction_data)?;

        msg!("bruh msg");
        msg!("bruh12321321");

        match instruction {
            EscrowInstruction::InitEscrow { amount } => {
                msg!("Instruction: InitEscrow");
                Self::process_init_escrow(accounts, amount, program_id)
            }
            EscrowInstruction::Exchange { amount } => {
                msg!("Instruction: Exchange");
                Self::accept_escrow_trade(accounts, amount, program_id)
            }
        }
    }

    fn accept_escrow_trade(
        accounts: &[AccountInfo],
        amountXToReceive: u64,
        program_id: &Pubkey,
    ) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();
        let taker = next_account_info(account_info_iter)?;

        if !taker.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }

        let taker_y_token_acc = next_account_info(account_info_iter)?;
        let taker_x_token_acc = next_account_info(account_info_iter)?;
        let pda_acc = next_account_info(account_info_iter)?;

        // let pdas_temp_token_account_info = TokenAccount::unpack(&pda_acc.try_borrow_data()?)?;
        let (pda, bump_seed) = Pubkey::find_program_address(&[b"escrow"], program_id);

        let init_main_acc = next_account_info(account_info_iter)?;
        let init_y_token_acc = next_account_info(account_info_iter)?;
        let esrow_acc = next_account_info(account_info_iter)?;
        let token_program = next_account_info(account_info_iter)?;
        let pda_account = next_account_info(account_info_iter)?;

        let escrow_info = Escrow::unpack_unchecked(&esrow_acc.try_borrow_data()?)?;

        msg!("about to start transfer to bob");
        let ix = spl_token::instruction::transfer(
            token_program.key, // TODO: i dont understand this
            pda_acc.key,
            taker_x_token_acc.key,
            &pda,
            &[&pda],
            amountXToReceive,
        )?;
        invoke_signed(
            &ix,
            &[
                pda_acc.clone(),
                taker_x_token_acc.clone(),
                pda_account.clone(),
                token_program.clone(),
            ],
            &[&[&b"escrow"[..], &[bump_seed]]],
        )
        // this can be done by the frontend
        // spl_token::instruction::transfer(taker_y_token_acc.owner, taker_y_token_acc.key , init_y_token_acc.key, pda_acc.key, signer_pubkeys: &[&Pubkey], amount: u64)
    }

    fn process_init_escrow(
        accounts: &[AccountInfo],
        amount: u64,
        program_id: &Pubkey,
    ) -> ProgramResult {
        let account_info_iter = &mut accounts.iter();
        let initializer = next_account_info(account_info_iter)?;

        if !initializer.is_signer {
            return Err(ProgramError::MissingRequiredSignature);
        }

        let temp_token_account = next_account_info(account_info_iter)?;

        let token_to_receive_account = next_account_info(account_info_iter)?;
        if *token_to_receive_account.owner != spl_token::id() {
            return Err(ProgramError::IncorrectProgramId);
        }

        let escrow_account = next_account_info(account_info_iter)?;
        let rent = &Rent::from_account_info(next_account_info(account_info_iter)?)?;

        if !rent.is_exempt(escrow_account.lamports(), escrow_account.data_len()) {
            return Err(EscrowError::NotRentExempt.into());
        }

        let mut escrow_info = Escrow::unpack_unchecked(&escrow_account.try_borrow_data()?)?;
        if escrow_info.is_initialized() {
            return Err(ProgramError::AccountAlreadyInitialized);
        }

        escrow_info.is_initialized = true;
        escrow_info.initializer_pubkey = *initializer.key;
        escrow_info.temp_token_account_pubkey = *temp_token_account.key;
        escrow_info.initializer_token_to_receive_account_pubkey = *token_to_receive_account.key;
        escrow_info.expected_amount = amount;

        // how does the escrow account get written finally?
        // weird types are matching
        Escrow::pack(escrow_info, &mut escrow_account.try_borrow_mut_data()?)?;

        let (pda, _bump_seed) = Pubkey::find_program_address(&[b"escrow"], program_id);
        let token_program = next_account_info(account_info_iter)?;
        let owner_change_ix = spl_token::instruction::set_authority(
            token_program.key,
            temp_token_account.key,
            Some(&pda),
            spl_token::instruction::AuthorityType::AccountOwner,
            initializer.key,
            &[&initializer.key],
        )?;

        msg!("escrow account {}", escrow_account.key);
        // msg!("")

        msg!("Calling the token program to transfer token account ownership...");
        invoke(
            &owner_change_ix,
            &[
                temp_token_account.clone(),
                initializer.clone(),
                token_program.clone(),
            ],
        )?;

        Ok(())
    }
}
