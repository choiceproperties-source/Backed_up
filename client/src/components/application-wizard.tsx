import { useState, ReactNode, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Check, ChevronLeft, ChevronRight, Loader2, AlertCircle, CheckCircle2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface WizardStep {
  id: string;
  title: string;
  description?: string;
  icon?: React.ElementType;
  optional?: boolean;
}

interface ApplicationWizardProps {
  steps: WizardStep[];
  currentStep: number;
  onStepChange: (step: number) => void;
  onComplete: () => void;
  children: ReactNode;
  isSubmitting?: boolean;
  canProceed?: boolean;
  completedSteps?: number[];
  title?: string;
  description?: string;
  wizardId?: string; // Added for state restoration
}

export function ApplicationWizard({
  steps,
  currentStep,
  onStepChange,
  onComplete,
  children,
  isSubmitting = false,
  canProceed = true,
  completedSteps = [],
  title = 'Submit Application',
  description = 'Complete the following steps to submit your application.',
  wizardId = 'default-wizard',
}: ApplicationWizardProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const progress = ((currentStep + 1) / steps.length) * 100;
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  // Restore state from localStorage on mount
  useEffect(() => {
    const savedStep = localStorage.getItem(`wizard-step-${wizardId}`);
    if (savedStep !== null) {
      const stepIndex = parseInt(savedStep, 10);
      if (stepIndex !== currentStep && stepIndex >= 0 && stepIndex < steps.length) {
        onStepChange(stepIndex);
      }
    }
  }, [wizardId]);

  // Persist current step
  useEffect(() => {
    localStorage.setItem(`wizard-step-${wizardId}`, currentStep.toString());
  }, [currentStep, wizardId]);

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
      localStorage.removeItem(`wizard-step-${wizardId}`);
    } else {
      // Show autosave feedback
      setIsSaving(true);
      setTimeout(() => {
        setIsSaving(false);
        onStepChange(currentStep + 1);
        toast({
          title: "Progress Saved",
          description: "Your application draft has been updated.",
          duration: 2000,
        });
      }, 600);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      onStepChange(currentStep - 1);
    }
  };

  const handleStepClick = (index: number) => {
    if (index < currentStep || completedSteps.includes(index)) {
      onStepChange(index);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto rounded-xl shadow-sm border-border/50" data-testid="application-wizard">
      <CardHeader className="space-y-4 p-8 border-b bg-muted/30">
        <div className="space-y-2">
          <CardTitle data-testid="wizard-title">{title}</CardTitle>
          <CardDescription data-testid="wizard-description">{description}</CardDescription>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
                Step {currentStep + 1} of {steps.length}
              </span>
              {isSaving && (
                <Badge variant="outline" className="h-5 px-2 gap-1.5 border-primary/20 bg-primary/5 text-primary animate-in fade-in zoom-in duration-300">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  <Save className="h-3 w-3" />
                  <span className="uppercase tracking-widest text-[10px] font-bold">Autosaved</span>
                </Badge>
              )}
            </div>
            <span className="font-medium">{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" data-testid="wizard-progress" />
        </div>

        <div className="hidden md:flex items-center justify-between gap-2" data-testid="wizard-steps">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = completedSteps.includes(index) || index < currentStep;
            const isCurrent = index === currentStep;
            const isClickable = index < currentStep || completedSteps.includes(index);

            return (
              <button
                key={step.id}
                onClick={() => handleStepClick(index)}
                disabled={!isClickable}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all flex-1',
                  isCurrent && 'bg-primary text-primary-foreground',
                  isCompleted && !isCurrent && 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
                  !isCurrent && !isCompleted && 'bg-muted text-muted-foreground',
                  isClickable && !isCurrent && 'hover:bg-muted/80 cursor-pointer'
                )}
                data-testid={`wizard-step-${step.id}`}
              >
                <div
                  className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0',
                    isCurrent && 'bg-primary-foreground text-primary',
                    isCompleted && !isCurrent && 'bg-green-500 text-white',
                    !isCurrent && !isCompleted && 'bg-background border'
                  )}
                >
                  {isCompleted && !isCurrent ? (
                    <Check className="h-3 w-3" />
                  ) : Icon ? (
                    <Icon className="h-3 w-3" />
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="flex flex-col items-start min-w-0">
                  <span className="font-medium truncate">{step.title}</span>
                  {step.optional && (
                    <span className="text-xs opacity-70">Optional</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="md:hidden" data-testid="wizard-steps-mobile">
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
              {currentStep + 1}
            </div>
            <div>
              <p className="font-medium">{steps[currentStep].title}</p>
              {steps[currentStep].description && (
                <p className="text-sm text-muted-foreground">{steps[currentStep].description}</p>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="min-h-[400px] overflow-hidden p-8" data-testid="wizard-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </CardContent>

      <CardFooter className="flex justify-between gap-4 border-t pt-6">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={isFirstStep || isSubmitting}
          data-testid="button-wizard-back"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>

        <div className="flex items-center gap-2">
          {steps[currentStep].optional && (
            <Button
              variant="ghost"
              onClick={() => onStepChange(currentStep + 1)}
              disabled={isLastStep || isSubmitting}
              data-testid="button-wizard-skip"
            >
              Skip
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={!canProceed || isSubmitting}
            data-testid="button-wizard-next"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : isLastStep ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Submit Application
              </>
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

interface WizardStepContentProps {
  title: string;
  description?: string;
  children: ReactNode;
  error?: string;
}

export function WizardStepContent({ title, description, children, error }: WizardStepContentProps) {
  return (
    <div className="space-y-6" data-testid="wizard-step-content">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive" data-testid="wizard-step-error">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <div className="space-y-4">{children}</div>
    </div>
  );
}

interface PaymentStatusBadgeProps {
  status: 'pending' | 'paid' | 'failed' | 'verified' | 'unverified';
}

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  const config = {
    pending: {
      label: 'Pending',
      variant: 'secondary' as const,
      icon: Loader2,
      className: 'animate-pulse',
    },
    paid: {
      label: 'Paid',
      variant: 'default' as const,
      icon: Check,
      className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
    },
    failed: {
      label: 'Failed',
      variant: 'destructive' as const,
      icon: AlertCircle,
      className: '',
    },
    verified: {
      label: 'Verified',
      variant: 'default' as const,
      icon: CheckCircle2,
      className: 'bg-green-500 text-white',
    },
    unverified: {
      label: 'Unverified',
      variant: 'outline' as const,
      icon: AlertCircle,
      className: 'border-orange-300 text-orange-600 dark:border-orange-700 dark:text-orange-400',
    },
  };

  const { label, variant, icon: Icon, className } = config[status] || config.pending;

  return (
    <Badge variant={variant} className={cn('gap-1', className)} data-testid={`badge-payment-${status}`}>
      <Icon className={cn('h-3 w-3', status === 'pending' && 'animate-spin')} />
      {label}
    </Badge>
  );
}

interface ConfirmationStepProps {
  title: string;
  items: { label: string; value: string | ReactNode }[];
  onEdit?: (section: string) => void;
}

export function ConfirmationStep({ title, items, onEdit }: ConfirmationStepProps) {
  return (
    <div className="space-y-4" data-testid="confirmation-step">
      <h4 className="font-medium">{title}</h4>
      <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
        {items.map((item, index) => (
          <div key={index} className="flex justify-between items-start gap-4">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-medium text-right">{item.value}</span>
          </div>
        ))}
        {onEdit && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => onEdit(title)}
            data-testid={`button-edit-${title.toLowerCase().replace(/\s+/g, '-')}`}
          >
            Edit
          </Button>
        )}
      </div>
    </div>
  );
}
