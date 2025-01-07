use bolt_lang::*;

declare_id!("DRfvXQiMMKYm29bWUH71Gznw31QjqhD7SJUqfEjeCsQQ");

pub const MAX_QUEUE_SIZE: usize = 2;
pub const MAX_WAITING_MATCHES: usize = 2;

#[component]
#[derive(Default)]
pub struct MatchQueue {
    #[max_len(MAX_QUEUE_SIZE)]
    pub queue: Vec<Player>,
    #[max_len(MAX_WAITING_MATCHES)]
    pub waiting_matches: Vec<Match>
}

// TODO: Replace it with
// #[subcomponent]
// #[derive(Default)]
#[derive(Default, Clone, InitSpace, AnchorSerialize, AnchorDeserialize)]
pub struct Match {
    pub players: [Pubkey; MAX_QUEUE_SIZE],
    pub created_at: u64
}

// TODO: Replace it with
// #[subcomponent]
// #[derive(Default)]
#[derive(Default, Clone, InitSpace, AnchorSerialize, AnchorDeserialize)]
pub struct Player {
    pub pubkey: Pubkey,
    pub waiting_since: u64
}
