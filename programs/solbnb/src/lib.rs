use anchor_lang::prelude::*;

declare_id!("FkYg3CaWUoN3Af6BU486X2rLpg4b3ra8gKBPiztd2WJd");

/// Public listing pin. Door / Wi-Fi plaintext never stored here —
/// only a 32-byte commitment (sha256) so buyers can verify unlock
/// material later without exposing it on-chain.
#[account]
#[derive(InitSpace)]
pub struct Listing {
    pub host: Pubkey,
    #[max_len(64)]
    pub name: String,
    /// WGS84 latitude
    pub lat: f64,
    /// WGS84 longitude
    pub lng: f64,
    /// sha256(door || 0x00 || wifi || 0x00 || salt)
    pub secrets_commitment: [u8; 32],
    pub nonce: u64,
    pub bump: u8,
}

#[program]
pub mod solbnb {
    use super::*;

    pub fn initialize_listing(
        ctx: Context<InitializeListing>,
        name: String,
        lat: f64,
        lng: f64,
        secrets_commitment: [u8; 32],
        nonce: u64,
    ) -> Result<()> {
        require!(!name.is_empty() && name.len() <= 64, SolbnbError::BadName);
        require!((-90.0..=90.0).contains(&lat), SolbnbError::BadCoords);
        require!((-180.0..=180.0).contains(&lng), SolbnbError::BadCoords);

        let listing = &mut ctx.accounts.listing;
        listing.host = ctx.accounts.host.key();
        listing.name = name;
        listing.lat = lat;
        listing.lng = lng;
        listing.secrets_commitment = secrets_commitment;
        listing.nonce = nonce;
        listing.bump = ctx.bumps.listing;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(
    name: String,
    lat: f64,
    lng: f64,
    secrets_commitment: [u8; 32],
    nonce: u64
)]
pub struct InitializeListing<'info> {
    #[account(
        init,
        payer = host,
        space = 8 + Listing::INIT_SPACE,
        seeds = [b"listing", host.key().as_ref(), &nonce.to_le_bytes()],
        bump
    )]
    pub listing: Account<'info, Listing>,

    #[account(mut)]
    pub host: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum SolbnbError {
    #[msg("Name must be 1..=64 chars")]
    BadName,
    #[msg("lat/lng out of range")]
    BadCoords,
}
