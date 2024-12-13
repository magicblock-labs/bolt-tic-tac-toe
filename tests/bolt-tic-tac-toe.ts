import { Keypair, PublicKey } from "@solana/web3.js";
import { Grid } from "../target/types/grid";
import { Players } from "../target/types/players";
import { JoinGame } from "../target/types/join_game";
import { Play } from "../target/types/play";
import {
    InitializeNewWorld,
    AddEntity,
    InitializeComponent,
    ApplySystem,
    Program,
    anchor
} from "@magicblock-labs/bolt-sdk"
import {assert, expect} from "chai";

describe("tic-tac-toe", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Constants used to test the program.
  let worldPda: PublicKey;
  let matchEntityPda: PublicKey;
  let componentPda: PublicKey;

  let player1: PublicKey = provider.wallet.publicKey;
  let player2: Keypair = Keypair.generate();

  const gridComponent = anchor.workspace.Grid as Program<Grid>;
  const playersComponent = anchor.workspace.Players as Program<Players>;
  const joinGameSystem = anchor.workspace.JoinGame as Program<JoinGame>;
  const playSystem = anchor.workspace.Play as Program<Play>;

  it("InitializeNewWorld", async () => {
    const initNewWorld = await InitializeNewWorld({
      payer: provider.wallet.publicKey,
      connection: provider.connection,
    });
    const txSign = await provider.sendAndConfirm(initNewWorld.transaction);
    worldPda = initNewWorld.worldPda;
    console.log(`Initialized a new world (PDA=${worldPda}). Initialization signature: ${txSign}`);
  });

  it("Add an entity", async () => {
    const addEntity = await AddEntity({
      payer: provider.wallet.publicKey,
      world: worldPda,
      connection: provider.connection,
    });
    const txSign = await provider.sendAndConfirm(addEntity.transaction);
    matchEntityPda = addEntity.entityPda;
    console.log(`Initialized a new Entity (PDA=${addEntity.entityPda}). Initialization signature: ${txSign}`);
  });

  it("Add the grid component", async () => {
    const initializeComponent = await InitializeComponent({
      payer: provider.wallet.publicKey,
      entity: matchEntityPda,
      componentId: gridComponent.programId,
    });
    const txSign = await provider.sendAndConfirm(initializeComponent.transaction);
    componentPda = initializeComponent.componentPda;
    console.log(`Initialized the grid component. Initialization signature: ${txSign}`);
  });

  it("Add the players component", async () => {
    const initializeComponent = await InitializeComponent({
      payer: provider.wallet.publicKey,
      entity: matchEntityPda,
      componentId: playersComponent.programId,
    });
    const txSign = await provider.sendAndConfirm(initializeComponent.transaction);
    console.log(`Initialized the grid component. Initialization signature: ${txSign}`);
  });
  it("Player 1 joins the game", async () => {
    const joinGame = await ApplySystem({
      authority: provider.wallet.publicKey,
      systemId: joinGameSystem.programId,
      world: worldPda,
      entities: [{
        entity: matchEntityPda,
        components: [{ componentId: playersComponent.programId }]
      }]
    });
    const txSign = await provider.sendAndConfirm(joinGame.transaction);
    console.log(`Player 1 joined the game. Signature: ${txSign}`);
  });
  it("Player 1 cannot join the game again", async () => {
    const joinGame = await ApplySystem({
      authority: provider.wallet.publicKey,
      systemId: joinGameSystem.programId,
      world: worldPda,
      entities: [{
        entity: matchEntityPda,
        components: [{ componentId: playersComponent.programId }]
      }]
    });
    try {
      const txSign = await provider.sendAndConfirm(joinGame.transaction);
      console.log(`Player 1 joined the game. Signature: ${txSign}`);
      assert.fail("Expected transaction to fail but it succeeded");
    } catch (error) {
      assert.isTrue(error.toString().includes("Error Message: Player already joined."));
    }
  });
  it("Player 2 joins the game", async () => {
    const joinGame = await ApplySystem({
      authority: player2.publicKey,
      systemId: joinGameSystem.programId,
      world: worldPda,
      entities: [{
        entity: matchEntityPda,
        components: [{ componentId: playersComponent.programId }]
      }]
    });
    const txSign = await provider.sendAndConfirm(joinGame.transaction, [player2]);
    console.log(`Player 2 joined the game. Signature: ${txSign}`);
  });
  it("Player 1 makes a move", async () => {
    const play = await ApplySystem({
      authority: provider.wallet.publicKey,
      systemId: playSystem.programId,
      world: worldPda,
      entities: [{
        entity: matchEntityPda,
        components: [{ componentId: gridComponent.programId }, { componentId: playersComponent.programId }]
      }],
      args: {
        row: 0,
        column: 0
      }
    });
    const txSign = await provider.sendAndConfirm(play.transaction);
    console.log(`Player 1 made a move. Signature: ${txSign}`);
  });
  it("Player 2 makes an invalid move", async () => {
    const play = await ApplySystem({
      authority: player2.publicKey,
      systemId: playSystem.programId,
      world: worldPda,
      entities: [{
        entity: matchEntityPda,
        components: [{ componentId: gridComponent.programId }, { componentId: playersComponent.programId }]
      }],
      args: {
        row: 0,
        column: 0
      }
    });
    try {
      const txSign = await provider.sendAndConfirm(play.transaction, [player2]);
      console.log(`Player 2 made an invalid move. Signature: ${txSign}`);
      assert.fail("Expected transaction to fail but it succeeded");
    } catch (error) {
      assert.isTrue(error.toString().includes("Error Message: Tile already set."));
    }
  });
  it("Player 2 makes a move", async () => {
    const play = await ApplySystem({
      authority: player2.publicKey,
      systemId: playSystem.programId,
      world: worldPda,
      entities: [{
        entity: matchEntityPda,
        components: [{ componentId: gridComponent.programId }, { componentId: playersComponent.programId }]
      }],
      args: {
        row: 0,
        column: 1
      }
    });
    const txSign = await provider.sendAndConfirm(play.transaction, [player2]);
    console.log(`Player 2 made a move. Signature: ${txSign}`);
  });
  it("Game continues until match is over", async () => {
    let players = [provider.wallet.publicKey, player2.publicKey];
    let moves = [
      [1, 0], [1, 1],
      [2, 0]
    ];
    for (let i = 0; i < moves.length; i++) {
      const play = await ApplySystem({
        authority: players[i % 2],
        systemId: playSystem.programId,
        world: worldPda,
        entities: [{
          entity: matchEntityPda,
          components: [{ componentId: gridComponent.programId }, { componentId: playersComponent.programId }]
        }],
        args: {
          row: moves[i][0],
          column: moves[i][1]
        }
      });
      let signers = undefined;
      if (i % 2 === 1) signers = [player2];
      const txSign = await provider.sendAndConfirm(play.transaction, signers);
      console.log(`Player ${players[i % 2].toBase58()} made a move. Signature: ${txSign}`);
    }
  });
  it("Fails to make a move after match is over", async () => {
    const play = await ApplySystem({
      authority: provider.wallet.publicKey,
      systemId: playSystem.programId,
      world: worldPda,
      entities: [{
        entity: matchEntityPda,
        components: [{ componentId: gridComponent.programId }, { componentId: playersComponent.programId }]
      }],
      args: {
        row: 0,
        column: 2
      }
    });
    try {
      const txSign = await provider.sendAndConfirm(play.transaction);
      console.log(`Player 1 made a move. Signature: ${txSign}`);
      assert.fail("Expected transaction to fail but it succeeded");
    } catch (error) {
      assert.isTrue(error.toString().includes("Error Message: Game is not active."));
    }
  });

  it("Check grid state", async () => {
    const grid = await gridComponent.account.grid.fetch(componentPda);
    expect(grid.board).to.deep.equal([
      [{ x: {} }, { o: {} }, null],
      [{ x: {} }, { o: {} }, null], 
      [{ x: {} }, null, null]
    ]);
    expect(grid.state.won.winner.toBase58()).to.equal(player1.toBase58());
  });
});
