// @ts-nocheck

import {
  Card,
  CardContent,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  AlertTriangle,
  Camera,
  CheckCircle,
  Edit,
  Trash2,
  User,
} from "lucide-react";


const statusColors = {
  active:
    "bg-emerald-100 text-emerald-700",

  inactive:
    "bg-gray-100 text-gray-600",

  suspended:
    "bg-red-100 text-red-700",
};


const departmentLabels = {
  welding: "Welding",
  assembly: "Assembly",
  painting: "Painting",
  electrical: "Electrical",
  warehouse: "Warehouse",
  chemical_lab: "Chemical Lab",
  maintenance: "Maintenance",
};


function normalizePhotoUrl(
  photoUrl
) {
  if (!photoUrl) {
    return "";
  }

  const value =
    String(photoUrl).trim();

  if (
    value.startsWith(
      "http://"
    ) ||
    value.startsWith(
      "https://"
    ) ||
    value.startsWith(
      "blob:"
    ) ||
    value.startsWith(
      "data:"
    )
  ) {
    return value;
  }

  const backendBaseUrl =
    import.meta.env.VITE_API_URL ||
    "http://127.0.0.1:8000";

  if (
    value.startsWith("/")
  ) {
    return (
      backendBaseUrl +
      value
    );
  }

  return (
    `${backendBaseUrl}/worker-photos/` +
    value
  );
}


export default function WorkerCard({
  worker,
  onEdit,
  onDelete,
}) {
  const complianceRate =
    worker.compliance_rate ??
    100;

  const isHighRisk =
    complianceRate < 80;

  const photoUrl =
    normalizePhotoUrl(
      worker.photo_url
    );

  const hasPhoto =
    Boolean(photoUrl);


  return (
    <Card className="border shadow-sm hover:shadow-md transition-all group">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="relative w-16 h-16 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden border-2 border-border">
            {hasPhoto ? (
              <img
                src={photoUrl}
                alt={
                  worker.full_name ||
                  "Worker"
                }
                className="w-full h-full object-cover"
                onError={(
                  event
                ) => {
                  event.currentTarget.style.display =
                    "none";

                  const fallback =
                    event.currentTarget
                      .nextElementSibling;

                  if (fallback) {
                    fallback.style.display =
                      "block";
                  }
                }}
              />
            ) : null}

            <User
              className="w-7 h-7 text-muted-foreground/40"
              style={{
                display: hasPhoto
                  ? "none"
                  : "block",
              }}
            />

            <div
              className={`absolute bottom-0 right-0 left-0 flex items-center justify-center gap-0.5 py-0.5 text-[8px] font-bold tracking-wide ${
                hasPhoto
                  ? "bg-emerald-500/90 text-white"
                  : "bg-amber-400/90 text-white"
              }`}
            >
              <Camera className="w-2 h-2" />

              {hasPhoto
                ? "FACE ID"
                : "NO PHOTO"}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm">
                {
                  worker.full_name
                }
              </h3>

              <Badge
                className={
                  statusColors[
                    worker.status ||
                      "active"
                  ]
                }
              >
                {worker.status ||
                  "active"}
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground mt-0.5">
              {
                worker.employee_id
              }{" "}
              ·{" "}
              {departmentLabels[
                worker.department
              ] ||
                worker.department}
            </p>

            {!hasPhoto && (
              <button
                type="button"
                onClick={() =>
                  onEdit(worker)
                }
                className="text-[10px] text-amber-600 mt-1 flex items-center gap-1 hover:underline"
              >
                <AlertTriangle className="w-3 h-3" />

                Add a face photo
              </button>
            )}

            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5">
                {isHighRisk ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                ) : (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                )}

                <span className="text-xs font-medium">
                  {complianceRate}%
                  compliant
                </span>
              </div>

              <span className="text-xs text-muted-foreground">
                {worker.total_violations ||
                  0}{" "}
                violations
              </span>
            </div>
          </div>

          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() =>
                onEdit(worker)
              }
            >
              <Edit className="w-3.5 h-3.5" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() =>
                onDelete(worker)
              }
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}