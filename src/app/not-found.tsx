import Link from "@/components/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center space-y-4">
      <h1 className="text-2xl font-bold">הדף לא נמצא</h1>
      <p className="text-charcoal-600">ייתכן שהקישור שגוי, שהפריט נמחק או שאין לכם הרשאה לצפות בו.</p>
      <Link href="/garage" className="inline-block rounded-xl bg-charcoal-900 text-sand-50 px-5 py-2.5 font-medium">
        חזרה לגראז׳
      </Link>
    </div>
  );
}
