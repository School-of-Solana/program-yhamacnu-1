use anchor_lang::prelude::*;

#[error_code]
pub enum CounterError {
    #[msg("Counter is at zero, cannot decrement")]
    Underflow,
    #[msg("Overflow, cannot increment further")]
    Overflow,
}