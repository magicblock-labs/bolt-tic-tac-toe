use bolt_lang::*;

declare_id!("5Xz6iiE2FZdpqrvCKbGqDajNYt1tP8cRGXrq3THSFo1q");

#[component]
#[derive(Default)]
pub struct Players {
    pub players: [Option<Pubkey>; 2],
}
