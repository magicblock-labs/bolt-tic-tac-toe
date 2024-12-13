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
        for player in &mut ctx.accounts.players.players {
            if let Some(player) = player {
                if *player == *ctx.accounts.authority.key {
                    return Err(PlayersError::PlayerAlreadyJoined.into());
                }
            } else {
                *player = Some(*ctx.accounts.authority.key);
                return ctx.accounts.try_to_vec(); // FIXME: #[system] transforms the return type to a (Vec<u8>,). Even though we can return Ok(ctx.accounts) at the end of the function, it doesn't compile if we attempt to "return Ok(ctx.accounts)" at any other point.
            }
        }
        Err(PlayersError::GameFull.into())
    }

    #[system_input]
    pub struct Components {
        pub players: Players,
    }

}
