import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export function middleware(req: NextRequest) {
  // const token = req.cookies.get("crm_token")?.value;
  // const url = req.nextUrl.clone();

  // if (url.pathname.startsWith("/dashboard")) {
  //   if (!token) {
  //     url.pathname = "/login";
  //     return NextResponse.redirect(url);
  //   }
  //   try {
  //     jwt.verify(token, process.env.JWT_SECRET as string);
  //   } catch {
  //     url.pathname = "/login";
  //     return NextResponse.redirect(url);
  //   }
  // }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
