import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Info, User, Crosshair, Eye, Sun, MousePointerClick } from "lucide-react";

const GUIDE_ITEMS = [
  { icon: User, text: "Camera must clearly show the worker's face." },
  { icon: Crosshair, text: "Worker should stand inside the scan area." },
  { icon: Eye, text: "Safety gear must be visible to the camera." },
  { icon: Sun, text: "Avoid poor lighting or blocked gear." },
  { icon: MousePointerClick, text: 'Click "Scan for Gear" after the camera starts.' },
];

export default function DetectionGuide() {
  return (
    <Card className="border shadow-sm flex-1 flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Info className="w-5 h-5 text-primary" /> Detection Guide
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-center">
        <div className="space-y-3">
          {GUIDE_ITEMS.map((item, i) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <item.icon className="w-4 h-4 text-primary" />
              </div>
              <span className="text-muted-foreground leading-relaxed pt-1">{item.text}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}