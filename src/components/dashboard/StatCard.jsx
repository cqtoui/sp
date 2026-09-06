import { cn } from "@/lib/utils";

export default function StatCard({ title, value, subtitle, icon: Icon, trend, trendUp, variant = "default", flash = false }) {
  const variants = {
    default: "bg-card",
    primary: "bg-primary/5 border-primary/20",
    success: "bg-emerald-50 border-emerald-200",
    danger: "bg-red-50 border-red-200",
    warning: "bg-amber-50 border-amber-200",
  };

  const iconVariants = {
    default: "bg-muted text-muted-foreground",
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-100 text-emerald-600",
    danger: "bg-red-100 text-red-600",
    warning: "bg-amber-100 text-amber-600",
  };

  return (
    <div className={cn("rounded-xl border p-5 transition-all hover:shadow-md", variants[variant], flash && "ring-2 ring-primary scale-[1.02] shadow-lg")}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          {trend && (
            <p className={cn("text-xs font-medium", trendUp ? "text-emerald-600" : "text-red-500")}>
              {trendUp ? "↑" : "↓"} {trend}
            </p>
          )}
        </div>
        {Icon && (
          <div className={cn("p-2.5 rounded-xl", iconVariants[variant])}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
}