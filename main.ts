import { App, staticFiles } from "fresh";
import { define, type State } from "./utils.ts";
import { ensureMerchantFunded } from "./lib/ensureMerchant.ts";

export const app = new App<State>();

// Fire-and-forget: create/fund Devnet merchant so bookings can land.
ensureMerchantFunded();

app.use(staticFiles());

app.use(define.middleware((ctx) => {
  console.log(`${ctx.req.method} ${ctx.req.url}`);
  return ctx.next();
}));

app.fsRoutes();
