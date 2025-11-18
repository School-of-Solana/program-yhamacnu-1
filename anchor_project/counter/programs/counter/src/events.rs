use anchor_lang::prelude::*;

#[event]
pub struct InitializeCounterEvent {
    pub counter: Pubkey,
    pub counter_authority: Pubkey,
    pub counter_value: u64,
}

#[event]
pub struct ModifyCounterEvent {
    pub past_value: u64,
    pub current_value: u64,
    pub user: Pubkey,
    pub counter: Pubkey,
}
