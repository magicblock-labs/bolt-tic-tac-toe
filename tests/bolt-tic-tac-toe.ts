import * as anchor from "@magicblock-labs/anchor";
import {Program} from "@magicblock-labs/anchor";
import { PublicKey } from "@solana/web3.js";
import { Grid } from "../target/types/grid";
import { Players } from "../target/types/players";
import { JoinGame } from "../target/types/join_game";
import { Play } from "../target/types/play";
import {
  FindComponentPda,
  InitializeNewWorld,
  AddEntity,
  InitializeComponent,
  ApplySystem,
} from "@magicblock-labs/bolt-sdk";

describe("BoltTicTacToe", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Constants used to test the program.
  let worldPda: PublicKey;
  let entityPda: PublicKey;

  const gridComponent = anchor.workspace.Grid as Program<Grid>;
  const playersComponent = anchor.workspace.Players as Program<Players>;
  const systemJoinGame = anchor.workspace.JoinGame as Program<JoinGame>;
  const systemPlay = anchor.workspace.Play as Program<Play>;

  it("InitializeNewWorld", async () => {
    const initNewWorld = await InitializeNewWorld({
      payer: provider.wallet.publicKey,
      connection: provider.connection,
    });
    const txSign = await provider.sendAndConfirm(initNewWorld.transaction);
    worldPda = initNewWorld.worldPda;
    console.log(`Initialized a new world (ID=${worldPda}). Initialization signature: ${txSign}`);
  });

  it("Create a match entity", async () => {
    const addEntity = await AddEntity({
        payer: provider.wallet.publicKey,
        world: worldPda,
        connection: provider.connection,
    });
    const txSign = await provider.sendAndConfirm(addEntity.transaction);
    entityPda = addEntity.entityPda;
    console.log(`Initialized a new Entity (ID=${addEntity.entityId}). Initialization signature: ${txSign}`);
  });

  it("Add a grid component", async () => {
    const initComponent = await InitializeComponent({
        payer: provider.wallet.publicKey,
        entity: entityPda,
        componentId: gridComponent.programId,
    });
    const txSign = await provider.sendAndConfirm(initComponent.transaction);
    console.log(`Initialized the grid component. Initialization signature: ${txSign}`);
  });

  it("Add the players component", async () => {
    const initComponent = await InitializeComponent({
      payer: provider.wallet.publicKey,
      entity: entityPda,
      componentId: playersComponent.programId,
    });
    const txSign = await provider.sendAndConfirm(initComponent.transaction);
    console.log(`Initialized a the players component. Initialization signature: ${txSign}`);
  });

  it("Apply system Join Game", async () => {
    const applySystem = await ApplySystem({
      authority: provider.wallet.publicKey,
      system: systemJoinGame.programId,
      entity: entityPda,
      components: [playersComponent.programId],
    });
    const txSign = await provider.sendAndConfirm(applySystem.transaction);
    console.log(`Applied a system. Initialization signature: ${txSign}`);
  });

  it("Apply system Play", async () => {
    const applySystem = await ApplySystem(
        {
          system: systemPlay.programId,
          components: [gridComponent.programId, playersComponent.programId],
          args: {
            row: 0,
            column: 0
          },
          authority: provider.wallet.publicKey,
          entity: entityPda,
        }
    );
    const txSign = await provider.sendAndConfirm(applySystem.transaction);
    console.log(`Applied a system. Initialization signature: ${txSign}\n\n`);

    // Print the grid.
    const gridComponentPda = FindComponentPda(gridComponent.programId, entityPda);
    const grid = await gridComponent.account.grid.fetch(gridComponentPda);
    print_grid(grid);
  });

  // Helper function to print the grid.
  function print_grid(grid: any) {
    grid.board.forEach((row, index, array) => {
      const rowString = row.map(cell =>
          cell == null ? ' ' :
              cell['x'] != null ? 'X' :
                  cell['o'] != null ? 'O' : ' '
      ).join(' | ');
      console.log(rowString);
      if (index < array.length - 1) {
        console.log('-'.repeat(rowString.length));
      }
    });
  }

});
