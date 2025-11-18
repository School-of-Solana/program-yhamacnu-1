# Project Description

**Deployed Frontend URL:** https://counter-frontend-omega.vercel.app/

**Solana Program ID:** HfB2cjfBFP8LBdnHLPMvV7bLswPS8TuyFY8ugDVCWLxK

## Project Overview

### Description
Rudimental counter having just one variable, that can be incremented and decremented with appropriate events.

### Key Features

- Create counter: Create a counter with a predetermined value.
- Increment counter value: User has the ability to increment the counter by one.
- Decrement counter value: User has the ability to decrement the counter by one.
  
### How to Use the dApp

1. **Connect Wallet**
2. **Create Counter**: Create a counter with an initial value.
3. **Increment / Decrement** Users can increment and decrement the value of counter variable.

## Program Architecture
Counter uses three core instructions - for counter creation with a predefined value and corresponding increments and decrements.

### PDA Usage
Used for counter initiation and counter modification.

**PDAs Used:**
- Counter PDA: Derived from [INIT_COUNTER_SEED.as_bytes(), counter_authority.key().as_ref()].
Purpose: Stores counter data.

- CounterModifier PDA: Derived from Seeds: [MODIFY_COUNTER_SEED.as_bytes(), modify_author.key().as_ref(), counter.key().as_ref()]
  Purpose: Tracks user modifications of the counter, i.e. increment or decrement.

### Program Instructions
[TODO: List and describe all the instructions in your Solana program]

**Instructions Implemented:**
- Initialize Counter: Creates a new counter PDA and stores a value in the counter variable.
- Increment : Allows a user to increment the counter.
- Decrement : Allows a user to cdcrement the counter.

### Account Structure

```rust
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
```

## Testing

### Test Coverage
This is a rudimental test coverage.

**Happy Path Tests:**
- Initialize Counter: Creates a new counter account with correct initial value (665ms)
- Increment Counter: Increases counter value by 1
- Decrement Counter: Decreases counter value by 1

**Unhappy Path Tests:**
- Initialize Duplicate: Fails when counter already exists
- Decrement Underflow: Fails when trying to decrement below zero
- Increment Overflow: Fails when trying to increment beyond u64::MAX
- Account Not Found: Fails when operating on non-existent counter

### Running Tests
```bash
# Commands to run your tests
cd anchor_project/counter
yarn install
anchor test
```

### Additional Notes for Evaluators

My first solana program and dapp for that matter. Frontend was a bigger challange. Commented out the Anchor.toml sections that I used for the devnet deployment and marked them as "use for deployment"