import { cookies } from "next/headers";

const ADMIN_COOKIE = "admin_auth";

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  const auth = cookieStore.get(ADMIN_COOKIE)?.value;

  return auth === process.env.ADMIN_PASSWORD;
}

export async function setAdminAuth() {
  const cookieStore = await cookies();

  cookieStore.set(ADMIN_COOKIE, process.env.ADMIN_PASSWORD ?? "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearAdminAuth() {
  const cookieStore = await cookies();

  cookieStore.delete(ADMIN_COOKIE);
}
