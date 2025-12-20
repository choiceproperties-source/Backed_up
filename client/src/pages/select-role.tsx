import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Key,
  Building2,
  Briefcase,
  UserCheck,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { UserRole } from "@/lib/types";

type RoleOption = {
  value: UserRole;
  label: string;
  description: string;
  icon: React.ElementType;
};

const ROLE_OPTIONS: RoleOption[] = [
  {
    value: "renter",
    label: "Renter",
    description: "Looking to rent a property",
    icon: Key,
  },
  {
    value: "landlord",
    label: "Landlord",
    description: "Individual property owner",
    icon: Building2,
  },
  {
    value: "property_manager",
    label: "Property Manager",
    description: "Manages multiple properties",
    icon: Briefcase,
  },
  {
    value: "agent",
    label: "Real Estate Agent",
    description: "Licensed real estate professional",
    icon: UserCheck,
  },
];

export default function SelectRole() {
  const { user, updateUserRole } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [selectedRole, setSelectedRole] = useState<UserRole>("renter");
  const [isSaving, setIsSaving] = useState(false);

  const redirectAfterSave = (role: UserRole) => {
    switch (role) {
      case "agent":
        setLocation("/agent-dashboard");
        break;
      case "landlord":
      case "property_manager":
        setLocation("/landlord-dashboard");
        break;
      case "renter":
        setLocation("/renter-dashboard");
        break;
      default:
        setLocation("/");
    }
  };

  const handleContinue = async () => {
    if (isSaving) return;

    setIsSaving(true);

    try {
      await updateUserRole(selectedRole);

      toast({
        title: "Welcome to Choice Properties!",
        description: `Your account has been set up as a ${
          ROLE_OPTIONS.find(r => r.value === selectedRole)?.label
        }.`,
      });

      redirectAfterSave(selectedRole);
    } catch (err: any) {
      console.error("[SelectRole] Failed to update role:", err);
      toast({
        title: "Unable to save role",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 to-secondary/5">
        <Card className="w-full max-w-lg p-8 shadow-xl">
          <header className="text-center mb-6">
            <h1 className="text-2xl font-bold">
              Welcome{user?.full_name ? `, ${user.full_name}` : ""}!
            </h1>
            <p className="text-muted-foreground">
              How will you use Choice Properties?
            </p>
          </header>

          <div className="space-y-3 mb-6">
            {ROLE_OPTIONS.map(({ value, label, description, icon: Icon }) => {
              const isSelected = selectedRole === value;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSelectedRole(value)}
                  className={`w-full flex items-start gap-4 rounded-lg border-2 p-4 text-left transition ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  }`}
                  data-testid={`role-${value}`}
                >
                  <div
                    className={`p-2 rounded-lg ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="flex-1">
                    <p
                      className={`font-medium ${
                        isSelected ? "text-primary" : ""
                      }`}
                    >
                      {label}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <Button
            onClick={handleContinue}
            disabled={isSaving}
            size="lg"
            className="w-full"
            data-testid="continue-role"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </Card>
      </main>

      <Footer />
    </div>
  );
}