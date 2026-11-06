import { define } from "../utils.ts";

export default define.page(function App({ Component }) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta
          name="description"
          content="SolBnB — book San Francisco stays on Solana Devnet and unlock door codes after payment."
        />
        <title>SolBnB</title>
        <link rel="icon" href="/favicon.ico" />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        />
        <link rel="stylesheet" href="/styles.css" />
        {/* Browser IIFE — keeps @solana/web3.js out of the Fresh island bundle */}
        <script src="https://unpkg.com/@solana/web3.js@1.98.2/lib/index.iife.min.js">
        </script>
      </head>
      <body>
        <Component />
      </body>
    </html>
  );
});
