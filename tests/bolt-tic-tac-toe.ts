import { Keypair, PublicKey, SYSVAR_INSTRUCTIONS_PUBKEY } from "@solana/web3.js";
import { Grid } from "../target/types/grid";
import { Players } from "../target/types/players";
import { JoinGame } from "../target/types/join_game";
import { Play } from "../target/types/play";
import { Matchqueue } from "../target/types/matchqueue";
import { Matchmaker } from "../target/types/matchmaker";
import { MatchInitializer } from "../target/types/match_initializer";
import {
  InitializeNewWorld,
  AddEntity,
  InitializeComponent,
  ApplySystem,
  Program,
  anchor,
  FindEntityPda,
  PROGRAM_IDL,
  FindComponentPda
// } from "@magicblock-labs/bolt-sdk";
} from "../../bolt/clients/bolt-sdk";
import { assert, expect } from "chai";

describe("tic-tac-toe", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Constants used to test the program.
  let worldPda: PublicKey;
  let matchEntityPda: PublicKey;
  let gridComponentPda: PublicKey;
  let playersComponentPda: PublicKey;
  let matchQueueComponentPda: PublicKey;
  let queueEntityPda: PublicKey;
  let player1: PublicKey = provider.wallet.publicKey;
  let player2: Keypair = Keypair.generate();

  const gridComponent = anchor.workspace.Grid as Program<Grid>;
  const playersComponent = anchor.workspace.Players as Program<Players>;
  const joinGameSystem = anchor.workspace.JoinGame as Program<JoinGame>;
  const playSystem = anchor.workspace.Play as Program<Play>;
  const matchqueue = anchor.workspace.Matchqueue as Program<Matchqueue>;
  const matchmaker = anchor.workspace.Matchmaker as Program<Matchmaker>;
  const matchInitializer = anchor.workspace.MatchInitializer as Program<MatchInitializer>;
  const worldProgram = new Program(PROGRAM_IDL, provider);

  it("Initialize new world", async () => {
    const initNewWorld = await InitializeNewWorld({
      payer: provider.wallet.publicKey,
      connection: provider.connection,
    });
    const txSign = await provider.sendAndConfirm(initNewWorld.transaction);
    worldPda = initNewWorld.worldPda;
    console.log(
      `Initialized a new world (PDA=${worldPda}). Initialization signature: ${txSign}. World ID: ${initNewWorld.worldId}`
    );
  });

  it("Add queue entity", async () => {
    const addEntity = await AddEntity({
      payer: provider.wallet.publicKey,
      world: worldPda,
      connection: provider.connection,
      seed: Buffer.from("queue"),
    });
    const txSign = await provider.sendAndConfirm(addEntity.transaction);
    queueEntityPda = addEntity.entityPda;
    console.log(
      `Initialized a new Entity (PDA=${addEntity.entityPda}). Initialization signature: ${txSign}`
    );
  });

  it("Initialize match queue", async () => {
    const initializeMatchQueue = await InitializeComponent({
      payer: provider.wallet.publicKey,
      entity: queueEntityPda,
      componentId: matchqueue.programId,
    });
    const txSign = await provider.sendAndConfirm(
      initializeMatchQueue.transaction
    );
    console.log(
      `Initialized the match queue. Initialization signature: ${txSign}`
    );
    matchQueueComponentPda = initializeMatchQueue.componentPda;
    const matchQueue = await matchqueue.account.matchQueue.fetch(
      matchQueueComponentPda
    );
    assert.equal(matchQueue.queue.length, 0);
    assert.equal(matchQueue.waitingMatches.length, 0);
  });

  it("Player 1 joins the match queue", async () => {
    const joinMatchQueue = await ApplySystem({
      authority: provider.wallet.publicKey,
      systemId: matchmaker.programId,
      world: worldPda,
      entities: [
        {
          entity: queueEntityPda,
          components: [{ componentId: matchqueue.programId }],
        },
      ],
    });
    const txSign = await provider.sendAndConfirm(joinMatchQueue.transaction);
    console.log(`Player 1 joined the match queue. Signature: ${txSign}`);
    const matchQueue = await matchqueue.account.matchQueue.fetch(
      matchQueueComponentPda
    );
    assert.equal(matchQueue.queue.length, 1);
    assert.equal(matchQueue.waitingMatches.length, 0);
    assert.equal(matchQueue.queue[0].pubkey.toBase58(), player1.toBase58());
  });

  it("Player 2 joins the match queue", async () => {
    const joinMatchQueue = await ApplySystem({
      authority: player2.publicKey,
      systemId: matchmaker.programId,
      world: worldPda,
      entities: [
        {
          entity: queueEntityPda,
          components: [{ componentId: matchqueue.programId }],
        },
      ],
    });
    const txSign = await provider.sendAndConfirm(joinMatchQueue.transaction, [
      player2,
    ]);
    console.log(`Player 2 joined the match queue. Signature: ${txSign}`);
    const matchQueue = await matchqueue.account.matchQueue.fetch(
      matchQueueComponentPda
    );
    assert.equal(matchQueue.queue.length, 0);
    assert.equal(matchQueue.waitingMatches.length, 1);
    assert.equal(
      matchQueue.waitingMatches[0].players[0].toBase58(),
      player1.toBase58()
    );
    assert.equal(
      matchQueue.waitingMatches[0].players[1].toBase58(),
      player2.publicKey.toBase58()
    );
  });

  it("Player 1 accepts match", async () => {
    matchEntityPda = FindEntityPda({
      world: worldPda,
      seed: Buffer.from("match"),
    });
    gridComponentPda = FindComponentPda({
      componentId: gridComponent.programId,
      entity: matchEntityPda
    });
    playersComponentPda = FindComponentPda({
      componentId: playersComponent.programId,
      entity: matchEntityPda
    });
    let instruction = await matchInitializer.methods.acceptMatch(Buffer.from("match"))
      .accounts({
        payer: provider.wallet.publicKey,
        worldProgram: worldProgram.programId,
        world: worldPda,
        entity: matchEntityPda,
        instructionSysvarAccount: SYSVAR_INSTRUCTIONS_PUBKEY,
        gridComponentPda: gridComponentPda,
        gridComponentProgram: gridComponent.programId,
        playersComponentPda: playersComponentPda,
        playersComponentProgram: playersComponent.programId,
      })
      .instruction();
    let transaction = new anchor.web3.Transaction().add(instruction);
    let signature = await provider.sendAndConfirm(transaction);
    console.log(
      `Player 1 accepted match (PDA=${matchEntityPda}). Signature: ${signature}`
    );
  });

  it("Player 1 accepts match", async () => {
    let instruction = await matchInitializer.methods.acceptMatch(Buffer.from("match"))
      .accounts({
        payer: provider.wallet.publicKey,
        worldProgram: worldProgram.programId,
        world: worldPda,
        entity: matchEntityPda,
        instructionSysvarAccount: SYSVAR_INSTRUCTIONS_PUBKEY,
        gridComponentPda: gridComponentPda,
        gridComponentProgram: gridComponent.programId,
        playersComponentPda: playersComponentPda,
        playersComponentProgram: playersComponent.programId,
      })
      .instruction();
    let transaction = new anchor.web3.Transaction().add(instruction);
    let signature = await provider.sendAndConfirm(transaction);
    console.log(
      `Player 2 accepted match (PDA=${matchEntityPda}). Signature: ${signature}`
    );
  });

  it("Player 1 joins the game", async () => {
    const joinGame = await ApplySystem({
      authority: provider.wallet.publicKey,
      systemId: joinGameSystem.programId,
      world: worldPda,
      entities: [
        {
          entity: matchEntityPda,
          components: [{ componentId: playersComponent.programId }],
        },
      ],
    });
    const txSign = await provider.sendAndConfirm(joinGame.transaction);
    console.log(`Player 1 joined the game. Signature: ${txSign}`);
  });
  it("Player 1 cannot join the game again", async () => {
    const joinGame = await ApplySystem({
      authority: provider.wallet.publicKey,
      systemId: joinGameSystem.programId,
      world: worldPda,
      entities: [
        {
          entity: matchEntityPda,
          components: [{ componentId: playersComponent.programId }],
        },
      ],
    });
    try {
      const txSign = await provider.sendAndConfirm(joinGame.transaction);
      console.log(`Player 1 joined the game. Signature: ${txSign}`);
      assert.fail("Expected transaction to fail but it succeeded");
    } catch (error) {
      assert.isTrue(
        error.toString().includes("Error Message: Player already joined.")
      );
    }
  });
  it("Player 2 joins the game", async () => {
    const joinGame = await ApplySystem({
      authority: player2.publicKey,
      systemId: joinGameSystem.programId,
      world: worldPda,
      entities: [
        {
          entity: matchEntityPda,
          components: [{ componentId: playersComponent.programId }],
        },
      ],
    });
    const txSign = await provider.sendAndConfirm(joinGame.transaction, [
      player2,
    ]);
    console.log(`Player 2 joined the game. Signature: ${txSign}`);
  });
  it("Player 1 makes a move", async () => {
    const play = await ApplySystem({
      authority: provider.wallet.publicKey,
      systemId: playSystem.programId,
      world: worldPda,
      entities: [
        {
          entity: matchEntityPda,
          components: [
            { componentId: gridComponent.programId },
            { componentId: playersComponent.programId },
          ],
        },
      ],
      args: {
        row: 0,
        column: 0,
      },
    });
    const txSign = await provider.sendAndConfirm(play.transaction);
    console.log(`Player 1 made a move. Signature: ${txSign}`);
  });
  it("Player 2 makes an invalid move", async () => {
    const play = await ApplySystem({
      authority: player2.publicKey,
      systemId: playSystem.programId,
      world: worldPda,
      entities: [
        {
          entity: matchEntityPda,
          components: [
            { componentId: gridComponent.programId },
            { componentId: playersComponent.programId },
          ],
        },
      ],
      args: {
        row: 0,
        column: 0,
      },
    });
    try {
      const txSign = await provider.sendAndConfirm(play.transaction, [player2]);
      console.log(`Player 2 made an invalid move. Signature: ${txSign}`);
      assert.fail("Expected transaction to fail but it succeeded");
    } catch (error) {
      assert.isTrue(
        error.toString().includes("Error Message: Tile already set.")
      );
    }
  });
  it("Player 2 makes a move", async () => {
    const play = await ApplySystem({
      authority: player2.publicKey,
      systemId: playSystem.programId,
      world: worldPda,
      entities: [
        {
          entity: matchEntityPda,
          components: [
            { componentId: gridComponent.programId },
            { componentId: playersComponent.programId },
          ],
        },
      ],
      args: {
        row: 0,
        column: 1,
      },
    });
    const txSign = await provider.sendAndConfirm(play.transaction, [player2]);
    console.log(`Player 2 made a move. Signature: ${txSign}`);
  });
  it("Game continues until match is over", async () => {
    let players = [provider.wallet.publicKey, player2.publicKey];
    let moves = [
      [1, 0],
      [1, 1],
      [2, 0],
    ];
    for (let i = 0; i < moves.length; i++) {
      const play = await ApplySystem({
        authority: players[i % 2],
        systemId: playSystem.programId,
        world: worldPda,
        entities: [
          {
            entity: matchEntityPda,
            components: [
              { componentId: gridComponent.programId },
              { componentId: playersComponent.programId },
            ],
          },
        ],
        args: {
          row: moves[i][0],
          column: moves[i][1],
        },
      });
      let signers = undefined;
      if (i % 2 === 1) signers = [player2];
      const txSign = await provider.sendAndConfirm(play.transaction, signers);
      console.log(
        `Player ${players[i % 2].toBase58()} made a move. Signature: ${txSign}`
      );
    }
  });
  it("Fails to make a move after match is over", async () => {
    const play = await ApplySystem({
      authority: provider.wallet.publicKey,
      systemId: playSystem.programId,
      world: worldPda,
      entities: [
        {
          entity: matchEntityPda,
          components: [
            { componentId: gridComponent.programId },
            { componentId: playersComponent.programId },
          ],
        },
      ],
      args: {
        row: 0,
        column: 2,
      },
    });
    try {
      const txSign = await provider.sendAndConfirm(play.transaction);
      console.log(`Player 1 made a move. Signature: ${txSign}`);
      assert.fail("Expected transaction to fail but it succeeded");
    } catch (error) {
      assert.isTrue(
        error.toString().includes("Error Message: Game is not active.")
      );
    }
  });

  it("Check grid state", async () => {
    const grid = await gridComponent.account.grid.fetch(gridComponentPda);
    expect(grid.board).to.deep.equal([
      [{ x: {} }, { o: {} }, null],
      [{ x: {} }, { o: {} }, null],
      [{ x: {} }, null, null],
    ]);
    expect(grid.state.won.winner.toBase58()).to.equal(player1.toBase58());
  });
});
