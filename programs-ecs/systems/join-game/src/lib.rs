use bolt_lang::*;
use players::Players;

declare_id!("7TsTc97MB21EKbh2RetcWsGWRJ4xuMkPKKD4DcMJ2Sms");

#[error_code]
pub enum PlayersError {
    #[msg("Game is full.")]
    GameFull,
}

#[system]
pub mod join_game {

    pub fn execute(ctx: Context<Components>, _args_p: Vec<u8>) -> Result<Components> {
        let players = &mut ctx.accounts.players.players;
        let idx = match players.iter_mut().position(|player| player.is_none()) {
            Some(player_index) => player_index,
            None => return Err(PlayersError::GameFull.into()),
        };
        ctx.accounts.players.players[idx] = Some(*ctx.accounts.authority.key);
        Ok(ctx.accounts)
    }

    #[system_input]
    pub struct Components {
        pub players: Players,
    }

}
