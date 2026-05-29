import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";

function Placeholder({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <header className="h-16 bg-card border-b flex items-center px-8 sticky top-0 z-10">
        <h2 className="text-lg font-semibold">{title}</h2>
      </header>
      <div className="p-8">
        <Card className="p-8 text-center space-y-2">
          <h3 className="font-bold text-lg">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
          <p className="text-xs text-muted-foreground pt-4">מודול זה נמצא בבניה — שלד הנתונים והגישה מוכנים. בקש בצ'אט להמשיך לבנות את המסכים הפרטניים.</p>
        </Card>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/students")({
  component: () => <Placeholder title="ניהול תלמידים" description="כרטיסי תלמידים, ת.ז, פרטי הורים, שיוך לקהילה וישיבה, סטטוס כרטיס חכם." />,
});
