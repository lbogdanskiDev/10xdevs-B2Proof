import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BriefFooterSectionProps {
  footer: string | null;
}

export function BriefFooterSection({ footer }: BriefFooterSectionProps) {
  if (!footer || footer.trim() === "") {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Footer</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground whitespace-pre-wrap">{footer}</p>
      </CardContent>
    </Card>
  );
}
