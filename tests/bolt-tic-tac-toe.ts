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
    anchor,
    InitializeRegistry
} from "../../bolt/clients/bolt-sdk/lib"
import {assert, expect} from "chai";

describe("tic-tac-toe", () => {
  const provider = anchor.AnchorProvider.local();

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

  it("Initialize registry", async () => {
    const registry = await InitializeRegistry({
      payer: provider.wallet.publicKey,
      connection: provider.connection,
    });
    try {
      await provider.sendAndConfirm(registry.transaction);
    } catch (error) {
      // Ignore error
    }
  });

  it("Initialize world", async () => {
    const initNewWorld = await InitializeNewWorld({
      payer: provider.wallet.publicKey,
      connection: provider.connection,
    });
    await provider.sendAndConfirm(initNewWorld.transaction);
    worldPda = initNewWorld.worldPda;
  });

  it("Add an entity", async () => {
    const addEntity = await AddEntity({
      payer: provider.wallet.publicKey,
      world: worldPda,
      connection: provider.connection,
    });
    await provider.sendAndConfirm(addEntity.transaction);
    matchEntityPda = addEntity.entityPda;
  });

  it("Add the grid component", async () => {
    const initializeComponent = await InitializeComponent({
      payer: provider.wallet.publicKey,
      entity: matchEntityPda,
      componentId: gridComponent.programId,
    });
    await provider.sendAndConfirm(initializeComponent.transaction);
    componentPda = initializeComponent.componentPda;
  });

  it("Add the players component", async () => {
    const initializeComponent = await InitializeComponent({
      payer: provider.wallet.publicKey,
      entity: matchEntityPda,
      componentId: playersComponent.programId,
    });
    await provider.sendAndConfirm(initializeComponent.transaction);
  });

  it("Join the game", async () => {
    const joinGame = await ApplySystem({
      authority: provider.wallet.publicKey,
      systemId: joinGameSystem.programId,
      world: worldPda,
      entities: [{
        entity: matchEntityPda,
        components: [{ componentId: playersComponent.programId }]
      }]
    });
    await provider.sendAndConfirm(joinGame.transaction);
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
    await provider.sendAndConfirm(joinGame.transaction, [player2]);
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
    await provider.sendAndConfirm(play.transaction);
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
      await provider.sendAndConfirm(play.transaction, [player2]);
      assert.fail("Expected transaction to fail but it succeeded");
    } catch (error) {
      expect(error.message).to.contain("Error Message: Tile already set..");
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
    await provider.sendAndConfirm(play.transaction, [player2]);
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
      await provider.sendAndConfirm(play.transaction, signers);
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
      await provider.sendAndConfirm(play.transaction);
      assert.fail("Expected transaction to fail but it succeeded");
    } catch (error) {
      expect(error.message).to.contain("Error Message: Game is not active..");
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
