import jackson from "@/modules/ee/sso/lib/jackson";
import type { OAuthReq } from "@boxyhq/saml-jackson";
import type { NextApiResponse } from "next";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, res: NextApiResponse) {
  const { oauthController } = await jackson();
  const searchParams = Object.fromEntries(req.nextUrl.searchParams);

  if (req.method !== "GET") {
    return res.status(400).send("Method not allowed");
  }

  try {
    const { redirect_url } = await oauthController.authorize(searchParams as unknown as OAuthReq);

    return NextResponse.redirect(redirect_url as string);
  } catch (err) {
    const { message, statusCode = 500 } = err;

    return Response.json({ message }, { status: statusCode });
  }
}
