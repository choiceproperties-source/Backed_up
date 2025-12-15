import { Shield, Lock, Eye, FileCheck, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface PrivacyNoticeProps {
  variant?: "compact" | "full" | "inline";
  className?: string;
  showDataCollection?: boolean;
  showSecurityInfo?: boolean;
  showPrivacyPolicy?: boolean;
}

export function PrivacyNotice({
  variant = "compact",
  className,
  showDataCollection = true,
  showSecurityInfo = true,
  showPrivacyPolicy = true,
}: PrivacyNoticeProps) {
  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
        <Lock className="h-3 w-3" />
        <span>Your information is protected with bank-level encryption</span>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn("bg-muted/30 rounded-lg p-3 space-y-2", className)}>
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span>Your Privacy Matters</span>
        </div>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          {showSecurityInfo && (
            <div className="flex items-start gap-2">
              <Lock className="h-3 w-3 mt-0.5 shrink-0" />
              <span>All data is encrypted with 256-bit SSL protection</span>
            </div>
          )}
          {showDataCollection && (
            <div className="flex items-start gap-2">
              <Eye className="h-3 w-3 mt-0.5 shrink-0" />
              <span>We only collect information necessary for your application</span>
            </div>
          )}
          {showPrivacyPolicy && (
            <div className="flex items-start gap-2">
              <FileCheck className="h-3 w-3 mt-0.5 shrink-0" />
              <span>
                View our{" "}
                <a href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </a>
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-accent/50 border border-border rounded-lg p-4", className)}>
      <div className="flex items-center gap-2 mb-3">
        <Shield className="h-5 w-5 text-primary" />
        <h4 className="font-semibold text-foreground">Privacy & Security Notice</h4>
      </div>
      
      <div className="space-y-3 text-sm text-muted-foreground">
        {showDataCollection && (
          <div className="flex items-start gap-3">
            <div className="bg-muted rounded-full p-1.5 shrink-0">
              <Eye className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">Data Collection</p>
              <p className="text-xs mt-0.5">
                We collect only the information necessary to process your rental application. 
                Your personal data will never be sold to third parties.
              </p>
            </div>
          </div>
        )}
        
        {showSecurityInfo && (
          <div className="flex items-start gap-3">
            <div className="bg-muted rounded-full p-1.5 shrink-0">
              <Lock className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">Bank-Level Security</p>
              <p className="text-xs mt-0.5">
                All data is encrypted using 256-bit SSL encryption. Payment information is 
                processed through PCI-DSS Level 1 compliant systems.
              </p>
            </div>
          </div>
        )}
        
        <div className="flex items-start gap-3">
          <div className="bg-muted rounded-full p-1.5 shrink-0">
            <FileCheck className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">Your Rights</p>
            <p className="text-xs mt-0.5">
              You have the right to access, correct, or delete your personal information at any time. 
              Contact us at privacy@choiceproperties.com for any privacy-related requests.
            </p>
          </div>
        </div>
      </div>
      
      {showPrivacyPolicy && (
        <div className="mt-4 pt-3 border-t border-border">
          <a 
            href="/privacy" 
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <Info className="h-3 w-3" />
            Read our full Privacy Policy and Terms of Service
          </a>
        </div>
      )}
    </div>
  );
}

export function SecurityBadges({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-4", className)}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
        <Shield className="h-3 w-3 text-green-600 dark:text-green-400" />
        <span>SSL Secured</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
        <Lock className="h-3 w-3 text-green-600 dark:text-green-400" />
        <span>PCI Compliant</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
        <FileCheck className="h-3 w-3 text-green-600 dark:text-green-400" />
        <span>FCRA Compliant</span>
      </div>
    </div>
  );
}

export function DataSecurityNotice({ className }: { className?: string }) {
  return (
    <div className={cn("bg-accent/50 border border-border rounded-lg p-3", className)}>
      <div className="flex items-start gap-2">
        <Shield className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Your data is secure</p>
          <p className="mt-0.5">
            All sensitive information is encrypted and stored securely. We comply with federal 
            fair housing laws and FCRA regulations.
          </p>
        </div>
      </div>
    </div>
  );
}
