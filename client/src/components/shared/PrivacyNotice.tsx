import { Shield, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function PrivacyNotice() {
  return (
    <Card className="border-muted">
      <CardContent className="flex items-start gap-3 p-4">
        <Shield className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-medium">Your Privacy is Protected</p>
          <p className="text-xs text-muted-foreground">
            Your personal information is encrypted and securely stored. We never share your data with third parties without your consent.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
