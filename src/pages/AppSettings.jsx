// @ts-nocheck

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HardHat, Glasses, Shield, Camera, Bell, Database, Hand, Headphones, Shirt } from "lucide-react";
import PageHeader from "../components/layout/PageHeader";
import AdminSecuritySettings from "../components/settings/AdminSecuritySettings";

export default function AppSettings() {
  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
      <PageHeader title="Settings" subtitle="Configure your AI SafeGuard system" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Row 1: Gear Detection (left) + Camera Configuration (right) */}
        <Card className="border shadow-sm flex flex-col">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4" /> Gear Detection Settings
            </CardTitle>
            <CardDescription className="text-xs">Configure which gear items the system checks for</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-3">
              {[
                { name: "Helmet", icon: HardHat, required: true },
                { name: "Safety Goggles", icon: Glasses, required: true },
                { name: "Safety Vest", icon: Shirt, required: true },
                { name: "Gloves", icon: Hand, required: true },
                { name: "Ear Protection", icon: Headphones, required: false },
                { name: "Lab Coat", icon: Shield, required: false },
              ].map((item) => (
                <div key={item.name} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <Badge className={item.required ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}>
                    {item.required ? "Required" : "Optional"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm flex flex-col">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Camera className="w-4 h-4" /> Camera Configuration
            </CardTitle>
            <CardDescription className="text-xs">Camera and detection settings</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-3">
            <div className="flex justify-between items-center p-3 rounded-lg border">
              <span className="text-sm">Detection Confidence Threshold</span>
              <Badge variant="outline">75%</Badge>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg border">
              <span className="text-sm">Auto-Scan on Person Detection</span>
              <Badge className="bg-emerald-100 text-emerald-700">Enabled</Badge>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg border">
              <span className="text-sm">Scan Interval</span>
              <Badge variant="outline">2 seconds</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Row 2: Alert Settings (left) + Admin Security (right) */}
        <Card className="border shadow-sm flex flex-col">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Bell className="w-4 h-4" /> Alert Settings
            </CardTitle>
            <CardDescription className="text-xs">Notification preferences</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-3">
            <div className="flex justify-between items-center p-3 rounded-lg border">
              <span className="text-sm">Sound Alerts</span>
              <Badge className="bg-emerald-100 text-emerald-700">Enabled</Badge>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg border">
              <span className="text-sm">Auto-escalate after</span>
              <Badge variant="outline">30 minutes</Badge>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg border">
              <span className="text-sm">Daily Report Email</span>
              <Badge className="bg-emerald-100 text-emerald-700">Enabled</Badge>
            </div>
          </CardContent>
        </Card>

        <AdminSecuritySettings />
      </div>

      {/* System Info — full width at bottom */}
      <Card className="border shadow-sm mt-6">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Database className="w-4 h-4" /> System Info
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex justify-between items-center p-3 rounded-lg border">
              <span className="text-sm text-muted-foreground">Version</span>
              <span className="font-mono text-sm">1.0.0</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg border">
              <span className="text-sm text-muted-foreground">AI Model</span>
              <span className="font-mono text-sm">SafeWatch Vision v1</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg border">
              <span className="text-sm text-muted-foreground">Detection Engine</span>
              <span className="font-mono text-sm">LLM-powered</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}