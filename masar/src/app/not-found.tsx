import Link from "next/link";
export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg p-6 text-center">
      <div>
        <p className="text-[64px] font-bold text-pale">404</p>
        <h1 className="text-[20px] font-semibold text-navy">Page not found · الصفحة غير موجودة</h1>
        <Link href="/home" className="mt-6 inline-flex h-11 items-center rounded-2xl bg-navy px-5 text-[14px] font-semibold text-white">MASAR</Link>
      </div>
    </div>
  );
}
