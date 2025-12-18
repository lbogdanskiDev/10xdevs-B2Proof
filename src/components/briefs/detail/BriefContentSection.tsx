import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BriefContentRenderer } from "./BriefContentRenderer";
import type { BriefDetailDto } from "@/types";

interface BriefContentSectionProps {
  content: BriefDetailDto["content"];
}

export function BriefContentSection({ content }: BriefContentSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Brief Content</CardTitle>
      </CardHeader>
      <CardContent>
        <BriefContentRenderer content={content} />
      </CardContent>
    </Card>
  );
}
