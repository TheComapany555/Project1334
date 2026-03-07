import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";

type LocationMapProps = {
  location: string;
};

export function LocationMap({ location }: LocationMapProps) {
  const src = `https://www.google.com/maps?q=${encodeURIComponent(location)}&output=embed`;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4" />
          Location
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <iframe
          title={`Map of ${location}`}
          src={src}
          width="100%"
          height="400"
          style={{ border: 0 }}
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          className="w-full"
        />
        <div className="px-4 py-2.5 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground">
            Approximate location — {location}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
