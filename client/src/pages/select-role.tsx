import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useLocation } from 'wouter';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  Key, 
  Building2, 
  Briefcase, 
  UserCheck,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { UserRole } from '@/lib/types';

const roleOptions: { value: UserRole; label: string; description: string; icon: any }[] = [
  { 
    value: 'renter', 
    label: 'Renter', 
    description: 'Looking to rent a property',
    icon: Key
  },
  { 
    value: 'landlord', 
    label: 'Landlord', 
    description: 'Individual property owner',
    icon: Building2
  },
  { 
    value: 'property_manager', 
    label: 'Property Manager', 
    description: 'Manages multiple properties',
    icon: Briefcase
  },
  { 
    value: 'agent', 
    label: 'Real Estate Agent', 
    description: 'Licensed real estate professional',
    icon: UserCheck
  },
];

export default function SelectRole() {
  const { user, updateUserRole } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<UserRole>('renter');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await updateUserRole(selectedRole);
      toast({
        title: "Welcome to Choice Properties!",
        description: `Your account has been set up as a ${roleOptions.find(r => r.value === selectedRole)?.label}.`,
      });
      
      // Redirect based on role
      if (selectedRole === 'agent') {
        setLocation('/agent-dashboard');
      } else if (selectedRole === 'landlord' || selectedRole === 'property_manager') {
        setLocation('/landlord-dashboard');
      } else {
        setLocation('/');
      }
    } catch (error: any) {
      toast({
        title: "Failed to update role",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 to-secondary/5">
        <Card className="max-w-lg w-full p-8 shadow-xl">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2">Welcome, {user?.full_name || 'there'}!</h2>
            <p className="text-muted-foreground">
              Tell us how you'll be using Choice Properties
            </p>
          </div>
          
          <div className="space-y-3 mb-6">
            {roleOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedRole === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedRole(option.value)}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left flex items-start gap-4 ${
                    isSelected 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                  data-testid={`button-role-${option.value}`}
                >
                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <span className={`font-medium block ${isSelected ? 'text-primary' : ''}`}>
                      {option.label}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {option.description}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <svg className="h-3 w-3 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full"
            size="lg"
            data-testid="button-continue-role"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting up your account...
              </>
            ) : (
              <>
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
