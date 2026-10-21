import { env } from "cloudflare:workers";
import { handleAccountRequest } from "../../../server/account.mjs";

export const dynamic = "force-dynamic";
const handle = (request: Request) => handleAccountRequest(request, env);
export const GET = handle;
export const POST = handle;
export const PUT = handle;
