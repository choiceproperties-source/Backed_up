import { CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineEvent {
  status: string;
  label: string;
  description: string;
  date?: string;
  isCurrent?: boolean;
  isCompleted?: boolean;
}

interface ApplicationTimelineProps {
  currentStatus: string;
  history: any[];
}

export function ApplicationTimeline({ currentStatus, history }: ApplicationTimelineProps) {
  const steps = [
    { key: 'submitted', label: 'Submitted', description: 'Application received and logged' },
    { key: 'under_review', label: 'Under Review', description: 'Property manager is reviewing details' },
    { key: 'background_check', label: 'Verification', description: 'Background and credit check in progress' },
    { key: 'decision', label: 'Final Decision', description: 'Approval or conditional offer' }
  ];

  const getStatusIndex = (status: string) => {
    if (['submitted', 'draft'].includes(status)) return 0;
    if (['under_review', 'info_requested'].includes(status)) return 1;
    if (['background_check'].includes(status)) return 2;
    if (['approved', 'rejected', 'conditional_approval'].includes(status)) return 3;
    return 0;
  };

  const currentIndex = getStatusIndex(currentStatus);

  return (
    <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 dark:before:via-gray-800 before:to-transparent">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex || (index === 3 && ['approved', 'rejected'].includes(currentStatus));
        const isCurrent = index === currentIndex;
        
        return (
          <div key={step.key} className={cn(
            "relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group",
            isCurrent ? "is-active" : ""
          )}>
            <div className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full border border-white dark:border-gray-950 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-colors duration-300",
              isCompleted ? "bg-green-500 text-white" : isCurrent ? "bg-primary text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-400"
            )}>
              {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : isCurrent ? <Clock className="h-5 w-5 animate-pulse" /> : <Circle className="h-5 w-5" />}
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 shadow-sm transition-all duration-300 group-[.is-active]:border-primary/20 group-[.is-active]:shadow-md">
              <div className="flex items-center justify-between space-x-2 mb-1">
                <div className="font-black uppercase tracking-widest text-xs text-primary">{step.label}</div>
                {isCurrent && <time className="font-mono text-[10px] text-primary animate-pulse">ACTIVE</time>}
              </div>
              <div className="text-sm text-muted-foreground">{step.description}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
