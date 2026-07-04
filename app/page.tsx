import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-primary-50 px-6">
      <div className="max-w-xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          Smart Finance AI
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Track your income, expenses, and receipts. Get AI-powered insights
          into your spending habits.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/login"
            className="rounded-xl bg-primary-600 px-6 py-3 text-white font-medium hover:bg-primary-700 transition"
          >
            Log In
          </Link>
          <Link
            href="/register"
            className="rounded-xl border border-slate-300 px-6 py-3 text-slate-700 font-medium hover:bg-slate-100 transition"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </main>
  );
}