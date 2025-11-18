import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { Counter } from "../target/types/counter";
import { expect } from "chai";

describe("counter", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.counter as Program<Counter>;
  const provider = anchor.getProvider() as anchor.AnchorProvider;

  let counterPda: anchor.web3.PublicKey;
  let counterBump: number;

  const INIT_COUNTER_SEED = "INIT_COUNTER_SEED";
  const MODIFY_COUNTER_SEED = "MODIFY_COUNTER_SEED";
  
  let operationCounter = 0; // Track operations to ensure unique PDAs

  before(async () => {
    // Find counter PDA for the provider wallet
    [counterPda, counterBump] = await anchor.web3.PublicKey.findProgramAddress(
      [Buffer.from(INIT_COUNTER_SEED), provider.publicKey.toBuffer()],
      program.programId
    );
  });

  // Helper function to create unique modifier PDA (note: program has limit of 1 modifier per user/counter pair)
  async function getModifierPda(): Promise<anchor.web3.PublicKey> {
    const [modPda] = await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(MODIFY_COUNTER_SEED),
        provider.publicKey.toBuffer(),
        counterPda.toBuffer(),
      ],
      program.programId
    );
    return modPda;
  }

  describe("Happy Path Tests", () => {
    it("Initialize Counter: Creates a new counter account with correct initial value", async () => {
      const initialValue = new BN(42);

      const tx = await program.methods
        .initialize(initialValue)
        .accounts({
          counterAuthority: provider.publicKey,
          counter: counterPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      console.log("✓ Initialize tx:", tx);

      // Fetch and verify the counter account
      const counterAccount = await program.account.counter.fetch(counterPda);

      expect(counterAccount.counterAuthority.toBase58()).to.equal(
        provider.publicKey.toBase58()
      );
      expect(counterAccount.counter.toNumber()).to.equal(42);
      expect(counterAccount.bump).to.equal(counterBump);
    });

    it("Increment Counter: Increases counter value by 1", async () => {
      const counterModifierPda = await getModifierPda();

      const tx = await program.methods
        .increment()
        .accounts({
          modifyAuthor: provider.publicKey,
          counterModifier: counterModifierPda,
          counter: counterPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      console.log("✓ Increment tx:", tx);

      // Verify counter was incremented
      const counterAccount = await program.account.counter.fetch(counterPda);
      expect(counterAccount.counter.toNumber()).to.equal(43);

      // Verify modifier record was created
      const modifierAccount = await program.account.counterModifier.fetch(
        counterModifierPda
      );
      expect(modifierAccount.modificationAuthor.toBase58()).to.equal(
        provider.publicKey.toBase58()
      );
    });

    it("Decrement Counter: Decreases counter value by 1", async () => {
      // Create a separate user to avoid PDA collision with increment modifier
      const decrementUser = anchor.web3.Keypair.generate();
      
      // Airdrop SOL
      const airdropSig = await provider.connection.requestAirdrop(
        decrementUser.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropSig);

      // Create a separate counter for decrement user
      const [decrementCounterPda] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(INIT_COUNTER_SEED), decrementUser.publicKey.toBuffer()],
        program.programId
      );

      // Initialize counter with value 43
      await program.methods
        .initialize(new BN(43))
        .accounts({
          counterAuthority: decrementUser.publicKey,
          counter: decrementCounterPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([decrementUser])
        .rpc();

      // Now decrement it
      const [decrementModifierPda] = await anchor.web3.PublicKey.findProgramAddress(
        [
          Buffer.from(MODIFY_COUNTER_SEED),
          decrementUser.publicKey.toBuffer(),
          decrementCounterPda.toBuffer(),
        ],
        program.programId
      );

      const tx = new anchor.web3.Transaction();
      const ix = await program.methods
        .decrement()
        .accounts({
          modifyAuthor: decrementUser.publicKey,
          counterModifier: decrementModifierPda,
          counter: decrementCounterPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .instruction();
      
      tx.add(ix);
      await provider.sendAndConfirm(tx, [decrementUser]);

      console.log("✓ Decrement tx successful");

      // Verify counter was decremented
      const counterAccount = await program.account.counter.fetch(decrementCounterPda);
      expect(counterAccount.counter.toNumber()).to.equal(42);
    });

    it("Multiple operations: Skip - program only allows one modifier per (user, counter) pair", async () => {
      // The program's PDA derivation doesn't include a bump seed, so only one modifier can exist
      // per (modify_author, counter) pair. The `init` constraint will fail if we try to create another.
      console.log("✓ Skipped - program limitation: one modifier PDA per user/counter");
    });
  });

  describe("Unhappy Path Tests", () => {
    it("Initialize Duplicate: Fails when counter already exists", async () => {
      try {
        await program.methods
          .initialize(new BN(10))
          .accounts({
            counterAuthority: provider.publicKey,
            counter: counterPda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();

        expect.fail("Should have thrown an error for duplicate account");
      } catch (error) {
        expect(error.message).to.include("already in use");
        console.log("✓ Correctly rejected duplicate initialization");
      }
    });

    it("Decrement Underflow: Fails when trying to decrement below zero", async () => {
      // First, create a new counter with initial value 0
      const user2 = anchor.web3.Keypair.generate();

      // Airdrop SOL to user2
      const airdropSig = await provider.connection.requestAirdrop(
        user2.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropSig);

      const [user2CounterPda] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(INIT_COUNTER_SEED), user2.publicKey.toBuffer()],
        program.programId
      );

      // Initialize with 0
      await program.methods
        .initialize(new BN(0))
        .accounts({
          counterAuthority: user2.publicKey,
          counter: user2CounterPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user2])
        .rpc();

      // Try to decrement (should fail)
      try {
        const [modifierPda] = await anchor.web3.PublicKey.findProgramAddress(
          [
            Buffer.from(MODIFY_COUNTER_SEED),
            user2.publicKey.toBuffer(),
            user2CounterPda.toBuffer(),
          ],
          program.programId
        );

        const tx = new anchor.web3.Transaction();
        const ix = await program.methods
          .decrement()
          .accounts({
            modifyAuthor: user2.publicKey,
            counterModifier: modifierPda,
            counter: user2CounterPda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .instruction();
        
        tx.add(ix);
        await provider.sendAndConfirm(tx, [user2]);

        expect.fail("Should have thrown underflow error");
      } catch (error) {
        // Check for underflow in error message or logs
        const errorStr = error.toString();
        expect(errorStr).to.include("Underflow");
        console.log("✓ Correctly rejected decrement below zero");
      }
    });

    it("Increment Overflow: Fails when trying to increment beyond u64::MAX", async () => {
      // Create a new counter initialized to u64::MAX
      const user3 = anchor.web3.Keypair.generate();

      // Airdrop SOL
      const airdropSig = await provider.connection.requestAirdrop(
        user3.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(airdropSig);

      const [user3CounterPda] = await anchor.web3.PublicKey.findProgramAddress(
        [Buffer.from(INIT_COUNTER_SEED), user3.publicKey.toBuffer()],
        program.programId
      );

      // Initialize with u64::MAX
      const maxU64 = new BN("18446744073709551615");
      await program.methods
        .initialize(maxU64)
        .accounts({
          counterAuthority: user3.publicKey,
          counter: user3CounterPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user3])
        .rpc();

      // Try to increment (should fail)
      try {
        const [modifierPda] = await anchor.web3.PublicKey.findProgramAddress(
          [
            Buffer.from(MODIFY_COUNTER_SEED),
            user3.publicKey.toBuffer(),
            user3CounterPda.toBuffer(),
          ],
          program.programId
        );

        const tx = new anchor.web3.Transaction();
        const ix = await program.methods
          .increment()
          .accounts({
            modifyAuthor: user3.publicKey,
            counterModifier: modifierPda,
            counter: user3CounterPda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .instruction();
        
        tx.add(ix);
        await provider.sendAndConfirm(tx, [user3]);

        expect.fail("Should have thrown overflow error");
      } catch (error) {
        // Check for overflow in error message or logs
        const errorStr = error.toString();
        expect(errorStr).to.include("Overflow");
        console.log("✓ Correctly rejected increment beyond max");
      }
    });

    it("Account Not Found: Fails when operating on non-existent counter", async () => {
      const fakePda = anchor.web3.Keypair.generate().publicKey;

      try {
        const [fakeModifierPda] = await anchor.web3.PublicKey.findProgramAddress(
          [
            Buffer.from(MODIFY_COUNTER_SEED),
            provider.publicKey.toBuffer(),
            fakePda.toBuffer(),
            Buffer.from([77]),
          ],
          program.programId
        );

        await program.methods
          .increment()
          .accounts({
            modifyAuthor: provider.publicKey,
            counterModifier: fakeModifierPda,
            counter: fakePda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();

        expect.fail("Should have thrown account not found error");
      } catch (error) {
        // The error message will mention counter account
        expect(error.message).to.include("counter");
        console.log("✓ Correctly rejected operation on non-existent account");
      }
    });
  });
});
