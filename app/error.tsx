"use client";

export default function AppError({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-[60vh] items-center justify-center px-5 py-12">
      <section role="alert" className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">โหลดข้อมูลไม่สำเร็จ</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต แล้วลองโหลดหน้านี้อีกครั้ง
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 min-h-11 rounded-xl bg-emerald-600 px-5 font-semibold text-white hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
        >
          ลองอีกครั้ง
        </button>
      </section>
    </main>
  );
}
