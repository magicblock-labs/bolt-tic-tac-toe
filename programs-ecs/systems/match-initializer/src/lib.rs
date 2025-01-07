use bolt_lang::anchor_lang;
pub use anchor_lang::prelude::*;
// use grid::Grid;
// use players::Players;

declare_id!("3gXs1mELhy5hb8w1QYCLEe1bFpkxu4MAcUVZcPonr2JJ");

#[program]
pub mod match_initializer {
    use bolt_lang::anchor_lang;
    use anchor_lang::prelude::*;
    use world::cpi::accounts::{AddEntity, InitializeComponent};

    pub fn accept_match(ctx: Context<AcceptMatch>, seed: Option<Vec<u8>>) -> Result<()> {
        let add_entity = AddEntity {
            payer: ctx.accounts.payer.to_account_info(),
            entity: ctx.accounts.entity.to_account_info(),
            world: ctx.accounts.world.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
        };
        let context = CpiContext::new(ctx.accounts.world_program.clone(), add_entity);
        world::cpi::add_entity(context, seed)?;

        let initialize_component = InitializeComponent {
            payer: ctx.accounts.payer.to_account_info(),
            entity: ctx.accounts.entity.to_account_info(),
            data: ctx.accounts.grid_component_pda.to_account_info(),
            component_program: ctx.accounts.grid_component_program.to_account_info(),
            authority: ctx.accounts.world_program.to_account_info(),
            instruction_sysvar_account: ctx.accounts.instruction_sysvar_account.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
        };
        let context = CpiContext::new(ctx.accounts.world_program.clone(), initialize_component);
        world::cpi::initialize_component(context)?;

        let initialize_component = InitializeComponent {
            payer: ctx.accounts.payer.to_account_info(),
            entity: ctx.accounts.entity.to_account_info(),
            data: ctx.accounts.players_component_pda.to_account_info(),
            component_program: ctx.accounts.players_component_program.to_account_info(),
            authority: ctx.accounts.world_program.to_account_info(),
            instruction_sysvar_account: ctx.accounts.instruction_sysvar_account.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
        };
        let context = CpiContext::new(ctx.accounts.world_program.clone(), initialize_component);
        world::cpi::initialize_component(context)?;

        Ok(())
    }

    #[derive(Accounts)]
    #[instruction(seed: Option<Vec<u8>>)]
    pub struct AcceptMatch<'info> {
        #[account(mut)]
        pub payer: Signer<'info>,
        #[account(mut)]
        pub entity: AccountInfo<'info>,
        #[account(mut)]
        pub world: AccountInfo<'info>,
        pub system_program: Program<'info, System>,
        pub world_program: AccountInfo<'info>,
        pub instruction_sysvar_account: UncheckedAccount<'info>,
        #[account(mut)]
        pub grid_component_pda: AccountInfo<'info>,
        pub grid_component_program: AccountInfo<'info>,
        #[account(mut)]
        pub players_component_pda: AccountInfo<'info>,
        pub players_component_program: AccountInfo<'info>,
    }
}
