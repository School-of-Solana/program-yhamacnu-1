use anchor_lang::prelude::*;
use crate::states::*;
use crate::events::InitializeCounterEvent;

#[derive(Accounts)]
pub struct InitializeCounter<'info> {
    #[account(mut)]
    pub counter_authority: Signer<'info>,
  #[account(
    init_if_needed,
    payer = counter_authority,
    space = 8 + 32 + 8 + 1,
    seeds = [INIT_COUNTER_SEED.as_bytes(), counter_authority.key().as_ref()],
    bump
  )]
    pub counter: Account<'info, Counter>,
    pub system_program: Program<'info, System>,
}

pub fn initialize_counter(ctx: Context<InitializeCounter>, value: u64) -> Result<()> {
  let counter = &mut ctx.accounts.counter;

  // If the account already exists and was initialized, do nothing to avoid
  // overwriting an existing counter. `init_if_needed` above will ensure the
  // account is created when missing; here we only set fields when the
  // account is not already initialized.
  if counter.counter_authority != Pubkey::default() {
    // Already initialized; no-op
    return Ok(());
  }

  counter.counter_authority = ctx.accounts.counter_authority.key();
  counter.counter = value;
  counter.bump = ctx.bumps.counter;


  emit!(InitializeCounterEvent {
    counter: counter.key(),
    counter_authority: counter.counter_authority,
    counter_value: counter.counter,
  });

  Ok(())
}