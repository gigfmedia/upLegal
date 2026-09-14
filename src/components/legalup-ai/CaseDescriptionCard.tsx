import { Card, CardContent } from '@/components/ui/card';

type Props = {
  description: string | null | undefined;
};

/**
 * 4.34Q — shared read-only Description card (legacy visual grammar).
 * Owners pass their authority: legacy workspace description, canonical live
 * lawyer_cases.description. Hidden when empty. Preserves line breaks as
 * stored; plain text only, never HTML.
 */
export function CaseDescriptionCard({ description }: Props) {
  if (!description?.trim()) return null;
  return (
    <Card className="mb-4">
      <CardContent className="p-5">
        <h2 className="text-sm font-semibold text-gray-900">Descripción</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
