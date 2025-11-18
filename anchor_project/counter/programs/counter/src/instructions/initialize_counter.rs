use anchor_lang::prelude::*;
use crate::states::*;
use crate::events::InitializeCounterEvent;

#[derive(Accounts)]
pub struct InitializeCounter<'info> {
    #[account(mut)]
    pub counter_authority: Signer<'info>,
    #[account(
        init, 
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