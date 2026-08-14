import { redirect } from "next/navigation";
import { setAdminAuth } from "@/lib/adminAuth";

async function login(formData: FormData) {
  "use server";

  const password = String(formData.get("password") ?? "");

  if (password !== process.env.ADMIN_PASSWORD) {
    redirect("/admin/login?error=1");
  }

  await setAdminAuth();

  redirect("/admin");
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <p className="font-bold text-blue-600">
          AI NEWS ジャパン
        </p>

        <h1 className="mt-2 text-3xl font-black text-slate-900">
          管理画面ログイン
        </h1>

        <p className="mt-3 text-sm text-slate-500">
          管理画面にアクセスするにはパスワードが必要です。
        </p>

        <form action={login} className="mt-8">
          <label
            htmlFor="password"
            className="block text-sm font-bold text-slate-700"
          >
            パスワード
          </label>

          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
          />

          {error && (
            <p className="mt-3 text-sm font-bold text-red-600">
              パスワードが正しくありません。
            </p>
          )}

          <button
            type="submit"
            className="mt-6 w-full rounded-2xl bg-slate-900 px-6 py-4 font-black text-white transition hover:bg-blue-600"
          >
            ログイン
          </button>
        </form>

        <a
          href="/"
          className="mt-5 block text-center text-sm font-bold text-slate-500 hover:text-blue-600"
        >
          ← トップページへ
        </a>
      </div>
    </main>
  );
}
