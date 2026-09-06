import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Eye, EyeOff } from "lucide-react";

const ADMIN_PASSWORD_KEY = "safeguard_admin_password";
const DEFAULT_PASSWORD = "12345678";

function getAdminPassword() {
  return localStorage.getItem(ADMIN_PASSWORD_KEY) || DEFAULT_PASSWORD;
}

export default function PasswordConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  destructive,
}) {
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");

  const handleClose = () => {
    setPassword("");
    setError("");
    onOpenChange(false);
  };

  const handleConfirm = () => {
    if (password === getAdminPassword()) {
      onConfirm();
      handleClose();
    } else {
      setError("Incorrect password. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-4 h-4" /> {title || "Admin Confirmation Required"}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {description || "Enter the admin password to continue."}
        </p>
        <div className="space-y-2">
          <div className="relative">
            <Input
              type={showPw ? "text" : "password"}
              placeholder="Admin password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
              className={error ? "border-red-500 pr-10" : "pr-10"}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button variant={destructive ? "destructive" : "default"} onClick={handleConfirm}>
            {confirmLabel || "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}