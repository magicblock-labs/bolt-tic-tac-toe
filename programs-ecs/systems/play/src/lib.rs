use bolt_lang::*;
use grid::Grid;
use players::Players;

declare_id!("DyUy1naq1kb3r7HYBrTf7YhnGMJ5k5NqS3Mhk65GfSih");

#[error_code]
pub enum TicTacToeError {
    #[msg("Player is not in the game.")]
    NotInGame,
    #[msg("Game is not active.")]
    NotActive,
    #[msg("Tile out of bound.")]
    TileOutOfBounds,
    #[msg("Tile already set.")]
    TileAlreadySet,
    #[msg("Not player's turn.")]
    NotPlayersTurn,
}

#[system]
pub mod play {

    pub fn execute(ctx: Context<Components>, args: Args) -> Result<Components> {
        let grid = &mut ctx.accounts.grid;
        let players = &mut ctx.accounts.players;
        let authority = *ctx.accounts.authority.key;
        require!(players.players[0] == Some(authority) || players.players[1] == Some(authority), TicTacToeError::NotInGame);
        require!(grid.state == grid::GameState::Active, TicTacToeError::NotActive);
        let player_idx : usize = if players.players[0] == Some(authority) { 0 } else { 1 };
        require!(grid.is_first_player_turn == (player_idx == 0), TicTacToeError::NotPlayersTurn);

        // Core game logic
        match args {
            tile @ Args {
                row: 0..=2,
                column: 0..=2,
            } => match grid.board[tile.row as usize][tile.column as usize] {
                Some(_) => return Err(TicTacToeError::TileAlreadySet.into()),
                None => {
                    grid.board[tile.row as usize][tile.column as usize] =
                        Some(grid::Sign::from_usize(player_idx));
                }
            },
            _ => return Err(TicTacToeError::TileOutOfBounds.into()),
        }
        grid.is_first_player_turn = !grid.is_first_player_turn;
        check_winner(grid, authority);
        Ok(ctx.accounts)
    }

    #[system_input]
    pub struct Components {
        pub grid: Grid,
        pub players: Players,
    }

    #[arguments]
    struct Args {
        row: u8,
        column: u8,
    }

}

pub fn check_winner(grid: &mut Account<Grid>, player: Pubkey) {
    let board = &grid.board;

    // Check rows and columns
    for i in 0..3 {
        if board[i][0] == board[i][1] && board[i][1] == board[i][2] && board[i][0].is_some() {
            grid.state = grid::GameState::Won { winner: player };
            return;
        }
        if board[0][i] == board[1][i] && board[1][i] == board[2][i] && board[0][i].is_some() {
            grid.state = grid::GameState::Won { winner: player };
            return;
        }
    }

    // Check diagonals
    if (board[0][0] == board[1][1] && board[1][1] == board[2][2] ||
        board[0][2] == board[1][1] && board[1][1] == board[2][0]) && board[1][1].is_some() {
        grid.state = grid::GameState::Won { winner: player };
        return;
    }

    // Check for draw
    let is_draw = board.iter().all(|row| row.iter().all(|cell| cell.is_some()));
    if is_draw {
        grid.state = grid::GameState::Tie;
        return;
    }
}
