import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-6 bg-slate-50 text-slate-900">
      <h2 className="text-2xl font-bold mb-2">الصفحة غير موجودة - 404</h2>
      <p className="text-slate-500 mb-4 text-sm">
        عذراً، لم نتمكن من العثور على الصفحة المطلوبة.
      </p>
      <Link
        href="/"
        className="px-4 py-2 bg-slate-900 text-white font-bold rounded-md text-xs hover:bg-slate-800 transition-colors"
      >
        العودة للرئيسية
      </Link>
    </div>
  );
}
