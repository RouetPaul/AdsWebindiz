import { neonAuthMiddleware } from "@neondatabase/auth/next/server";

export default neonAuthMiddleware({
  loginUrl: "/login",
});

export const config = {
  matcher: [
    "/((?!login|api/auth|api/sync|api/seed|_next/static|_next/image|favicon.ico).*)",
  ],
};
