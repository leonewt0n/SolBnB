use anchor_lang::prelude::*;

declare_id!("FkYg3CaWUoN3Af6BU486X2rLpg4b3ra8gKBPiztd2WJd");

/// Minimum booking price (0.001 SOL) — keeps demos above dust.
pub const MIN_PRICE_LAMPORTS: u64 = 1_000_000;

/// Public listing pin.
///
/// Demo mode: door / Wi-Fi plaintext is stored on-chain so unlock does not
/// depend on a local secrets file. Anyone can read these fields from the
/// account — use fake credentials only.
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
    #[max_len(64)]
    pub door_code: String,
    #[max_len(128)]
    pub wifi_password: String,
    pub nonce: u64,
    pub bump: u8,
    /// Flat booking price in lamports; paid to `host`.
    pub price_lamports: u64,
}

#[program]
pub mod solbnb {
    use super::*;

    pub fn initialize_listing(
        ctx: Context<InitializeListing>,
        name: String,
        lat: f64,
        lng: f64,
        door_code: String,
        wifi_password: String,
        nonce: u64,
        price_lamports: u64,
    ) -> Result<()> {
        require!(!name.is_empty() && name.len() <= 64, SolbnbError::BadName);
        require!((-90.0..=90.0).contains(&lat), SolbnbError::BadCoords);
        require!((-180.0..=180.0).contains(&lng), SolbnbError::BadCoords);
        require!(
            !door_code.is_empty() && door_code.len() <= 64,
            SolbnbError::BadSecrets
        );
        require!(
            !wifi_password.is_empty() && wifi_password.len() <= 128,
            SolbnbError::BadSecrets
        );
        require!(
            price_lamports >= MIN_PRICE_LAMPORTS,
            SolbnbError::BadPrice
        );

        let listing = &mut ctx.accounts.listing;
        listing.host = ctx.accounts.host.key();
        listing.name = name;
        listing.lat = lat;
        listing.lng = lng;
        listing.door_code = door_code;
        listing.wifi_password = wifi_password;
        listing.nonce = nonce;
        listing.bump = ctx.bumps.listing;
        listing.price_lamports = price_lamports;
        Ok(())
    }

    /// Host updates public listing fields + door / Wi-Fi.
    pub fn update_listing(
        ctx: Context<UpdateListing>,
        name: String,
        lat: f64,
        lng: f64,
        door_code: String,
        wifi_password: String,
        price_lamports: u64,
    ) -> Result<()> {
        require!(!name.is_empty() && name.len() <= 64, SolbnbError::BadName);
        require!((-90.0..=90.0).contains(&lat), SolbnbError::BadCoords);
        require!((-180.0..=180.0).contains(&lng), SolbnbError::BadCoords);
        require!(
            !door_code.is_empty() && door_code.len() <= 64,
            SolbnbError::BadSecrets
        );
        require!(
            !wifi_password.is_empty() && wifi_password.len() <= 128,
            SolbnbError::BadSecrets
        );
        require!(
            price_lamports >= MIN_PRICE_LAMPORTS,
            SolbnbError::BadPrice
        );

        let listing = &mut ctx.accounts.listing;
        listing.name = name;
        listing.lat = lat;
        listing.lng = lng;
        listing.door_code = door_code;
        listing.wifi_password = wifi_password;
        listing.price_lamports = price_lamports;
        Ok(())
    }

    /// Host closes their Listing PDA and reclaims rent.
    pub fn close_listing(_ctx: Context<CloseListing>) -> Result<()> {
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(
    name: String,
    lat: f64,
    lng: f64,
    door_code: String,
    wifi_password: String,
    nonce: u64,
    price_lamports: u64
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

#[derive(Accounts)]
pub struct UpdateListing<'info> {
    #[account(
        mut,
        seeds = [b"listing", host.key().as_ref(), &listing.nonce.to_le_bytes()],
        bump = listing.bump,
        has_one = host @ SolbnbError::Unauthorized
    )]
    pub listing: Account<'info, Listing>,

    pub host: Signer<'info>,
}

#[derive(Accounts)]
pub struct CloseListing<'info> {
    #[account(
        mut,
        close = host,
        seeds = [b"listing", host.key().as_ref(), &listing.nonce.to_le_bytes()],
        bump = listing.bump,
        has_one = host @ SolbnbError::Unauthorized
    )]
    pub listing: Account<'info, Listing>,

    #[account(mut)]
    pub host: Signer<'info>,
}

#[error_code]
pub enum SolbnbError {
    #[msg("Name must be 1..=64 chars")]
    BadName,
    #[msg("lat/lng out of range")]
    BadCoords,
    #[msg("Only the listing host can close or update this account")]
    Unauthorized,
    #[msg("Price must be at least 0.001 SOL (1_000_000 lamports)")]
    BadPrice,
    #[msg("Door code (1..=64) and Wi-Fi password (1..=128) are required")]
    BadSecrets,
}
