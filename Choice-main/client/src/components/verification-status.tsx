import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileCheck, 
  UserCheck, 
  Building, 
  CreditCard,
  Shield,
  FileText,
  Loader2,
  XCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface VerificationStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  icon: React.ComponentType<{ className?: string }>;
  estimatedTime?: string;
  completedAt?: string;
  notes?: string;
}

interface VerificationStatusProps {
  applicationId: string;
  applicationStatus: string;
  submittedAt?: string;
  className?: string;
}

const getVerificationSteps = (status: string): VerificationStep[] => {
  const baseSteps: VerificationStep[] = [
    {
      id: 'document_review',
      title: 'Document Review',
      description: 'Our team is reviewing your submitted documents for completeness and authenticity.',
      status: 'pending',
      icon: FileCheck,
      estimatedTime: '1-2 business days'
    },
    {
      id: 'identity_verification',
      title: 'Identity Verification',
      description: 'Verifying your identity against government-issued documents.',
      status: 'pending',
      icon: UserCheck,
      estimatedTime: '1-2 business days'
    },
    {
      id: 'employment_verification',
      title: 'Employment & Income Verification',
      description: 'Confirming your employment status and income details with your employer.',
      status: 'pending',
      icon: Building,
      estimatedTime: '2-3 business days'
    },
    {
      id: 'credit_check',
      title: 'Credit Assessment',
      description: 'Performing a soft credit inquiry to assess your financial profile.',
      status: 'pending',
      icon: CreditCard,
      estimatedTime: '1-2 business days'
    },
    {
      id: 'background_check',
      title: 'Background Screening',
      description: 'Conducting a comprehensive background check for your application.',
      status: 'pending',
      icon: Shield,
      estimatedTime: '2-4 business days'
    },
    {
      id: 'rental_history',
      title: 'Rental History Verification',
      description: 'Contacting previous landlords to verify your rental history.',
      status: 'pending',
      icon: FileText,
      estimatedTime: '2-3 business days'
    }
  ];
  
  // Update statuses based on application status
  switch (status) {
    case 'draft':
      return baseSteps;
    case 'pending':
      return baseSteps.map((step, index) => ({
        ...step,
        status: index === 0 ? 'in_progress' : 'pending'
      }));
    case 'under_review':
      return baseSteps.map((step, index) => {
        if (index < 2) return { ...step, status: 'completed' as const };
        if (index === 2) return { ...step, status: 'in_progress' as const };
        return step;
      });
    case 'pending_verification':
      return baseSteps.map((step, index) => {
        if (index < 4) return { ...step, status: 'completed' as const };
        if (index === 4) return { ...step, status: 'in_progress' as const };
        return step;
      });
    case 'approved':
    case 'approved_pending_lease':
      return baseSteps.map(step => ({ ...step, status: 'completed' as const }));
    case 'rejected':
      return baseSteps.map((step, index) => {
        if (index < 3) return { ...step, status: 'completed' as const };
        if (index === 3) return { ...step, status: 'failed' as const, notes: 'Verification issue identified' };
        return step;
      });
    default:
      return baseSteps;
  }
};

const statusConfig = {
  pending: { 
    color: 'text-muted-foreground', 
    bgColor: 'bg-muted', 
    label: 'Pending',
    ringColor: 'ring-muted'
  },
  in_progress: { 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-100 dark:bg-blue-900', 
    label: 'In Progress',
    ringColor: 'ring-blue-500'
  },
  completed: { 
    color: 'text-green-600', 
    bgColor: 'bg-green-100 dark:bg-green-900', 
    label: 'Completed',
    ringColor: 'ring-green-500'
  },
  failed: { 
    color: 'text-red-600', 
    bgColor: 'bg-red-100 dark:bg-red-900', 
    label: 'Failed',
    ringColor: 'ring-red-500'
  }
};

export function VerificationStatus({ applicationId, applicationStatus, submittedAt, className }: VerificationStatusProps) {
  const [steps, setSteps] = useState<VerificationStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Simulate loading verification status
    const timer = setTimeout(() => {
      setSteps(getVerificationSteps(applicationStatus));
      setIsLoading(false);
    }, 800);
    
    return () => clearTimeout(timer);
  }, [applicationStatus]);
  
  const completedCount = steps.filter(s => s.status === 'completed').length;
  const progress = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;
  const currentStep = steps.find(s => s.status === 'in_progress');
  
  const getEstimatedCompletion = () => {
    if (applicationStatus === 'approved' || applicationStatus === 'approved_pending_lease') {
      return 'Completed';
    }
    if (applicationStatus === 'rejected') {
      return 'Review complete';
    }
    
    // Calculate estimated days remaining
    const remainingSteps = steps.filter(s => s.status === 'pending' || s.status === 'in_progress');
    if (remainingSteps.length === 0) return 'Complete';
    
    return '5-10 business days';
  };
  
  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Application Verification
            </CardTitle>
            <CardDescription>
              Track the progress of your application verification process
            </CardDescription>
          </div>
          <Badge variant={applicationStatus === 'approved' ? 'default' : applicationStatus === 'rejected' ? 'destructive' : 'secondary'}>
            {applicationStatus.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Progress Overview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium">{completedCount}/{steps.length} steps completed</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {submittedAt && `Submitted ${new Date(submittedAt).toLocaleDateString()}`}
            </span>
            <span>Est. completion: {getEstimatedCompletion()}</span>
          </div>
        </div>
        
        {/* Current Step Highlight */}
        {currentStep && (
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              </div>
              <div>
                <h4 className="font-medium text-blue-900 dark:text-blue-100">
                  Currently: {currentStep.title}
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-0.5">
                  {currentStep.description}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Estimated time: {currentStep.estimatedTime}
                </p>
              </div>
            </div>
          </div>
        )}
        
        <Separator />
        
        {/* All Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => {
            const config = statusConfig[step.status];
            const Icon = step.icon;
            const isLast = index === steps.length - 1;
            
            return (
              <div key={step.id} className="relative">
                {/* Connector Line */}
                {!isLast && (
                  <div 
                    className={cn(
                      "absolute left-5 top-10 w-0.5 h-[calc(100%+8px)]",
                      step.status === 'completed' ? 'bg-green-500' : 'bg-muted'
                    )}
                  />
                )}
                
                <div className="flex gap-4">
                  {/* Icon */}
                  <div 
                    className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center shrink-0 ring-2",
                      config.bgColor,
                      config.ringColor
                    )}
                  >
                    {step.status === 'in_progress' ? (
                      <Loader2 className={cn("h-5 w-5 animate-spin", config.color)} />
                    ) : step.status === 'completed' ? (
                      <CheckCircle2 className={cn("h-5 w-5", config.color)} />
                    ) : step.status === 'failed' ? (
                      <XCircle className={cn("h-5 w-5", config.color)} />
                    ) : (
                      <Icon className={cn("h-5 w-5", config.color)} />
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0 pb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className={cn(
                        "font-medium",
                        step.status === 'pending' ? 'text-muted-foreground' : ''
                      )}>
                        {step.title}
                      </h4>
                      <Badge variant="outline" className={cn("text-xs", config.color)}>
                        {config.label}
                      </Badge>
                    </div>
                    <p className={cn(
                      "text-sm mt-0.5",
                      step.status === 'pending' ? 'text-muted-foreground/70' : 'text-muted-foreground'
                    )}>
                      {step.description}
                    </p>
                    {step.notes && (
                      <p className={cn(
                        "text-xs mt-1",
                        step.status === 'failed' ? 'text-red-600' : 'text-muted-foreground'
                      )}>
                        {step.notes}
                      </p>
                    )}
                    {step.status !== 'completed' && step.status !== 'failed' && step.estimatedTime && (
                      <p className="text-xs text-muted-foreground/70 mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {step.estimatedTime}
                      </p>
                    )}
                    {step.completedAt && (
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Completed {new Date(step.completedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Footer Note */}
        <div className="bg-muted/50 rounded-lg p-3 mt-4">
          <p className="text-xs text-muted-foreground">
            <strong>Note:</strong> Verification times may vary depending on response times from employers, previous landlords, and verification agencies. 
            We'll notify you via email when your application status changes.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
