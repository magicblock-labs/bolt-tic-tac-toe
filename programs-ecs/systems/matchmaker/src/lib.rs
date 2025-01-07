use bolt_lang::*;
use match_queue::{Match, MatchQueue, Player};

declare_id!("DTyVdseiJgcLeX1JNWBKf2cjfk6TuGkkiiUd8hFF64dZ");

#[system]
pub mod matchmaker {
    pub const MAX_WAIT_TIME: u64 = 60;

    pub fn execute(mut ctx: Context<Components>, _args_p: Vec<u8>) -> Result<Components> {
        enter(&mut ctx)?;
        Ok(ctx.accounts)
    }

    #[system_input]
    pub struct Components {
        pub match_queue: MatchQueue
    }
}

fn enter(ctx: &mut Context<Components>) -> Result<()> {
    let now = 0;

    update_or_enter(ctx, now)?;
    purge_old_players(ctx, now)?;
    if is_full(ctx) {
        prepare_match(ctx, now)?;
    }
    Ok(())
}

fn update_or_enter(ctx: &mut Context<Components>, now: u64) -> Result<()> {
    let pubkey = ctx.accounts.authority.key();
    let match_queue = &mut ctx.accounts.match_queue;
    if let Some(player) = match_queue.queue.iter_mut().find(|player| player.pubkey == pubkey) {
        player.waiting_since = now;
    } else {
        match_queue.queue.push(Player { pubkey, waiting_since: now });
    }
    Ok(())
}

fn purge_old_players(ctx: &mut Context<Components>, now: u64) -> Result<()> {
    let match_queue = &mut ctx.accounts.match_queue;
    match_queue.queue.retain(|player| now - player.waiting_since < MAX_WAIT_TIME);
    Ok(())
}

fn is_full(ctx: &Context<Components>) -> bool {
    ctx.accounts.match_queue.queue.len() == match_queue::MAX_QUEUE_SIZE
}

pub fn prepare_match(ctx: &mut Context<Components>, now: u64) -> Result<()> {
    let player1 = ctx.accounts.match_queue.queue.pop().unwrap();
    let player0 = ctx.accounts.match_queue.queue.pop().unwrap();
    let match_queue = &mut ctx.accounts.match_queue;
    match_queue.waiting_matches.push(Match {
        players: [player0.pubkey, player1.pubkey],
        created_at: now
    });
    Ok(())
}
