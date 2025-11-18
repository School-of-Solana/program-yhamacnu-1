use anchor_lang::prelude::*;

use crate::errors::CounterError;
use crate::states::*;
use crate::events::ModifyCounterEvent;


#[derive(Accounts)]
pub struct ModifyCounter<'info> {
    // TODO: Add required account constraints
    #[account(mut)]
    pub modify_author: Signer<'info>,
    #[account(
        init_if_needed,
        payer = modify_author,
        space = 8
        + 32 
        + 8
        + 1,
        seeds = [MODIFY_COUNTER_SEED.as_bytes(), modify_author.key().as_ref(), counter.key().as_ref()],
        bump
    )]
    pub counter_modifier: Account<'info, CounterModifier>,
    #[account(mut)]
    pub counter: Account<'info, Counter>,
    pub system_program: Program<'info, System>,
}

pub fn modify_counter(ctx: Context<ModifyCounter>, modification: ModType) -> Result<()> {
    let counter = &mut ctx.accounts.counter;
    let counter_modifier = &mut ctx.accounts.counter_modifier;
    let modify_author = &ctx.accounts.modify_author;

    if counter.counter == 0 && modification == ModType::Decrement {
        return Err(CounterError::Underflow.into());
    }

    if counter.counter == u64::MAX && modification == ModType::Increment {
        return Err(CounterError::Overflow.into());
    }

    let past_value = counter.counter;

    match modification {
        ModType::Increment => {
            counter.counter += 1;
        }
        ModType::Decrement => {
            counter.counter -= 1;
        }
    }

    counter_modifier.modification_author = *modify_author.key;
    counter_modifier.modification = modification;
    counter_modifier.bump = ctx.bumps.counter_modifier;

    emit!(ModifyCounterEvent {
        past_value: past_value,
        current_value: counter.counter,
        user: modify_author.key(),
        counter: counter.key(),
    });

    Ok(())
}
