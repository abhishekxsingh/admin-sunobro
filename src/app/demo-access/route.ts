import { NextResponse } from "next/server";

export function GET(request: Request) {
  const url = new URL(request.url);
  const rawNext = url.searchParams.get("next") ?? "/admin";
  const next = rawNext.startsWith("/") ? rawNext : "/admin";
  const res = NextResponse.redirect(new URL(next, request.url));
  res.cookies.set("sb_admin_demo", "1", {
    path: "/",
    maxAge: 60 * 60 * 24,
    httpOnly: false,
    sameSite: "lax",
  });
  return res;
}
