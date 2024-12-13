use bolt_lang::*;
use players::Players;

declare_id!("7TsTc97MB21EKbh2RetcWsGWRJ4xuMkPKKD4DcMJ2Sms");

#[error_code]
pub enum PlayersError {
    #[msg("Game is full.")]
    GameFull,
    #[msg("Player already joined.")]
    PlayerAlreadyJoined,
}

#[system]
pub mod join_game {

    pub fn execute(ctx: Context<Components>, _args_p: Vec<u8>) -> Result<Components> {
        for (index, player) in ctx.accounts.players.players.into_iter().enumerate() {
            if let Some(player) = player {
                if player == *ctx.accounts.authority.key {
                    return Err(PlayersError::PlayerAlreadyJoined.into());
                }
            } else {
                ctx.accounts.players.players[index] = Some(*ctx.accounts.authority.key);
                return Ok(ctx.accounts);
            }
        }
        Err(PlayersError::GameFull.into())
    }

    #[system_input]
    pub struct Components {
        pub players: Players,
    }

}
