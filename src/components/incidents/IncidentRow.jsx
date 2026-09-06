import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Eye, CheckCircle, Trash2 } from "lucide-react";

function formatUAETime(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-GB", {
    timeZone: "Asia/Dubai",
    day: "2-digit", month: "short",
    hour: "2-digit", minute: "2-digit"
  });
}

const severityColors = {
  low: "bg-blue-100 text-blue-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

const statusColors = {
  open: "bg-red-100 text-red-700",
  acknowledged: "bg-amber-100 text-amber-700",
  resolved: "bg-emerald-100 text-emerald-700",
  escalated: "bg-purple-100 text-purple-700",
};

const ADMIN_PASSWORD_KEY = "safeguard_admin_password";
const DEFAULT_PASSWORD = "12345678";
function getAdminPassword() {
  return localStorage.getItem(ADMIN_PASSWORD_KEY) || DEFAULT_PASSWORD;
}

export default function IncidentRow({ incident, onResolve, onView, onDelete }) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  const handleDeleteConfirm = () => {
    if (password === getAdminPassword()) {
      onDelete(incident);
      setShowDeleteDialog(false);
      setPassword("");
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  return (
    <>
      <TableRow className="hover:bg-muted/50">
        <TableCell className="font-medium text-sm">{incident.worker_name || "Unknown"}</TableCell>
        <TableCell className="text-sm text-muted-foreground">{incident.department || "—"}</TableCell>
        <TableCell>
          <div className="flex flex-wrap gap-1">
            {(incident.missing_gear || []).map((gear) => (
              <Badge key={gear} variant="outline" className="text-[10px] border-red-200 text-red-600">
                {gear.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
        </TableCell>
        <TableCell>
          <Badge className={severityColors[incident.severity || "medium"]}>
            {incident.severity || "medium"}
          </Badge>
        </TableCell>
        <TableCell>
          <Badge className={statusColors[incident.status || "open"]}>
            {incident.status || "open"}
          </Badge>
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {formatUAETime(incident.incident_time || incident.created_date)}
        </TableCell>
        <TableCell>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onView(incident)}>
              <Eye className="w-3.5 h-3.5" />
            </Button>
            {(incident.status === "open" || !incident.status) && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" onClick={() => onResolve(incident)}>
                <CheckCircle className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={() => { setShowDeleteDialog(true); setPassword(""); setPasswordError(false); }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Admin Confirmation Required</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Enter the admin password to delete this incident.</p>
          <Input
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setPasswordError(false); }}
            onKeyDown={(e) => e.key === "Enter" && handleDeleteConfirm()}
            className={passwordError ? "border-red-500" : ""}
          />
          {passwordError && <p className="text-xs text-red-500">Incorrect password. Please try again.</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}