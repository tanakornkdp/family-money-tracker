import Link from "next/link";
import { ArrowRight, BarChart3, ReceiptText, ShieldCheck } from "lucide-react";

const benefits = [
  {
    icon: ReceiptText,
    title: "บันทึกง่าย",
    description: "เพิ่มรายรับ รายจ่าย หรือแนบใบเสร็จได้ในไม่กี่แตะ",
  },
  {
    icon: BarChart3,
    title: "เห็นภาพรวม",
    description: "ดูแนวโน้มการใช้เงินและเป้าหมายของครอบครัวได้ชัดเจน",
  },
  {
    icon: ShieldCheck,
    title: "ข้อมูลเป็นส่วนตัว",
    description: "แยกข้อมูลแต่ละครอบครัว พร้อมตรวจสิทธิ์ก่อนเข้าถึง",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-5 py-16 sm:px-8 lg:px-12">
        <div className="max-w-3xl">
          <p className="mb-5 inline-flex rounded-full border border-teal-400/30 bg-teal-400/10 px-3 py-1 text-sm font-medium text-teal-200">
            Family Money Tracker
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
            จัดการเงินครอบครัว
            <span className="block text-teal-300">ให้เห็นภาพในที่เดียว</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            บันทึกรายการ ดูแนวโน้ม และวางแผนเป้าหมายร่วมกันได้ทุกที่
            ใช้งานผ่านเว็บหรือเพิ่มไว้บนหน้าจอมือถือเป็นแอพได้
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-teal-300 focus:outline-none focus:ring-2 focus:ring-teal-200 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              เริ่มใช้งาน <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-700 px-5 py-3 font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-300 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              สร้างบัญชี
            </Link>
          </div>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          {benefits.map(({ icon: Icon, title, description }) => (
            <article key={title} className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
              <Icon className="text-teal-300" size={24} aria-hidden="true" />
              <h2 className="mt-4 text-lg font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
