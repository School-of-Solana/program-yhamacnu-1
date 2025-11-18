use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod states;
pub mod events;

use instructions::*;

declare_id!("HfB2cjfBFP8LBdnHLPMvV7bLswPS8TuyFY8ugDVCWLxK");

#[program]
pub mod counter {
    use super::*;

    pub fn initialize(ctx: Context<InitializeCounter>, value: u64) -> Result<()> {
        initialize_counter(ctx, value)
    }

    pub fn increment(ctx: Context<ModifyCounter>) -> Result<()> {
        modify_counter(ctx, states::ModType::Increment)
    }

    pub fn decrement(ctx: Context<ModifyCounter>) -> Result<()> {
        modify_counter(ctx, states::ModType::Decrement)
    }
}

#[derive(Accounts)]
pub struct Initialize {}
