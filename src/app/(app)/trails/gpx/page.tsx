import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, Notice } from "@/components/ui";
import { GpxImporter } from "./importer";

export const metadata: Metadata = { title: "ייבוא GPX" };

export default function GpxPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={<Link href="/trails" className="hover:underline">מסלולים</Link>}
        title="ייבוא קובץ GPX"
        subtitle="הקובץ נבדק בשרת (מבנה, גודל, תקינות קואורדינטות) לפני הצגה. הקובץ אינו נשמר ואינו מתפרסם."
      />
      <Notice tone="info">
        תצוגה זו מציגה קו על המפה בלבד — זו אינה ניווט פנייה-אחר-פנייה. מסלול מקובץ אינו מעיד על זכות גישה או עבירות. להוספת מסלול לקטלוג הציבורי, צוות הנתונים מייבא מקבצים ממקורות בעלי רישיון.
      </Notice>
      <GpxImporter />
    </div>
  );
}
