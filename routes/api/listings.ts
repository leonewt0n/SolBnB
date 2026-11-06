import { define } from "../../utils.ts";
import { PUBLIC_LISTINGS } from "../../data/listings.public.ts";

export const handler = define.handlers({
  GET() {
    return Response.json(PUBLIC_LISTINGS);
  },
});
