import type { Metadata } from "next";
import Link from "next/link";
import { DIFFICULTY_RUBRIC } from "@/lib/trails";
import { PageHeader, Card, Notice } from "@/components/ui";

export const metadata: Metadata = { title: "רובריקת קושי" };

export default function RubricPage() {
  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <PageHeader eyebrow={<Link href="/trails" className="hover:underline">מסלולים</Link>} title="איך מדורג קושי מסלול" subtitle="דירוג 1–5 לפי המכשול הקשה ביותר במסלול, בתנאים יבשים ורגילים." />
      <ol className="flex flex-col gap-3">
        {DIFFICULTY_RUBRIC.map((d) => (
          <li key={d.level}>
            <Card className="p-5 grid gap-3 sm:grid-cols-[5rem_1fr]">
              <div className="text-3xl font-bold text-olive-700">
                {d.level}
                <span className="block text-sm font-medium text-charcoal-700">{d.label}</span>
              </div>
              <div className="text-sm grid gap-1">
                <p>
                  <strong>שטח: </strong>
                  {d.description}
                </p>
                <p>
                  <strong>רכב: </strong>
                  {d.vehicle}
                </p>
                <p>
                  <strong>נהג: </strong>
                  {d.driver}
                </p>
              </div>
            </Card>
          </li>
        ))}
      </ol>
      <Notice tone="warn">
        גשם, שיטפונות, בוץ ושחיקה משנים מסלול במהירות — מסלול בדרגה 2 עלול להפוך לבלתי עביר. הדירוג אינו מבטיח מעבר בטוח, ואינו מחליף בדיקת תנאים עדכנית והגבלות גישה.
      </Notice>
    </div>
  );
}
