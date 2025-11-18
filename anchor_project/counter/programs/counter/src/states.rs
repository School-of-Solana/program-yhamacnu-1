use anchor_lang::prelude::*;

pub const INIT_COUNTER_SEED: &str = "INIT_COUNTER_SEED";
pub const MODIFY_COUNTER_SEED: &str = "MODIFY_COUNTER_SEED";

#[derive(AnchorDeserialize, AnchorSerialize, Clone, InitSpace, PartialEq)]
pub enum ModType {
    Increment,
    Decrement,
}

#[account]
#[derive(InitSpace)]
pub struct Counter {
    pub counter_authority: Pubkey,
    pub counter: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct CounterModifier {
    pub modification_author: Pubkey,
    pub modification: ModType,
    pub bump: u8,
}
