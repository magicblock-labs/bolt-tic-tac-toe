use bolt_lang::*;

declare_id!("HLzXXTbMUjemRSQr5LHjtZgBvqyieuhY8wE29xYzhZSX");

#[component]
#[derive(Default)]
pub struct Players {
    pub players: [Option<Pubkey>; 2],
}
