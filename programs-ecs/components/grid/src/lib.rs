use bolt_lang::*;

declare_id!("9EoKMqQqrgRAxVED34q17e466RKme5sTUkuCqUGH4bij");

#[component]
pub struct Grid {
    pub board: [[Option<Sign>; 3]; 3],
    pub state: GameState,
    pub is_first_player_turn: bool,
}

#[component_deserialize]
#[derive(PartialEq)]
pub enum GameState {
    Active,
    Tie,
    Won { winner: Pubkey },
}

#[component_deserialize]
#[derive(PartialEq)]
pub enum Sign {
    X,
    O,
}

impl Sign {
    pub fn from_usize(value: usize) -> Sign {
        match value {
            0 => Sign::X,
            _ => Sign::O,
        }
    }
}

impl Default for Grid {
    fn default() -> Self {
        Self::new(GridInit{
            board: [[None; 3]; 3],
            state: GameState::Active,
            is_first_player_turn: true,
        })
    }
}
