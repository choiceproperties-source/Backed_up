import { Shield, Lock, CheckCircle } from "lucide-react";

export default function SecurityBadges() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 py-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Lock className="h-4 w-4" />
        <span className="text-xs">SSL Encrypted</span>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Shield className="h-4 w-4" />
        <span className="text-xs">Secure Platform</span>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <CheckCircle className="h-4 w-4" />
        <span className="text-xs">Verified</span>
      </div>
    </div>
  );
}
