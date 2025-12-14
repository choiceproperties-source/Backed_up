import { Check, Clock, AlertCircle } from 'lucide-react';

export interface TimelineStep {
  id: string;
  label: string;
  description?: string;
  date?: Date | null;
  status: 'completed' | 'current' | 'pending' | 'failed';
}

interface TimelineProps {
  steps: TimelineStep[];
  vertical?: boolean;
}

export function Timeline({ steps, vertical = true }: TimelineProps) {
  if (vertical) {
    return (
      <div className="relative">
        {steps.map((step, index) => {
          const isCompleted = step.status === 'completed';
          const isCurrent = step.status === 'current';
          const isFailed = step.status === 'failed';
          
          return (
            <div key={step.id} className="flex gap-4 pb-8">
              {/* Timeline line and dot */}
              <div className="relative flex flex-col items-center">
                {/* Dot */}
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center z-10
                  ${isCompleted ? 'bg-green-100 dark:bg-green-900' : ''}
                  ${isCurrent ? 'bg-blue-100 dark:bg-blue-900 ring-2 ring-blue-400 dark:ring-blue-500' : ''}
                  ${isFailed ? 'bg-red-100 dark:bg-red-900' : ''}
                  ${!isCompleted && !isCurrent && !isFailed ? 'bg-gray-200 dark:bg-gray-700' : ''}
                `}>
                  {isCompleted && <Check className="w-5 h-5 text-green-600 dark:text-green-400" />}
                  {isCurrent && <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                  {isFailed && <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />}
                  {!isCompleted && !isCurrent && !isFailed && (
                    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full" />
                  )}
                </div>
                
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className={`
                    w-1 h-12 mt-2
                    ${isCompleted ? 'bg-green-200 dark:bg-green-800' : 'bg-gray-200 dark:bg-gray-700'}
                  `} />
                )}
              </div>
              
              {/* Content */}
              <div className="flex-1 pt-1">
                <h3 className={`
                  font-medium text-sm
                  ${isFailed ? 'text-red-600 dark:text-red-400' : 'text-foreground'}
                `}>
                  {step.label}
                </h3>
                {step.description && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {step.description}
                  </p>
                )}
                {step.date && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(step.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Horizontal timeline
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {steps.map((step, index) => {
        const isCompleted = step.status === 'completed';
        const isCurrent = step.status === 'current';
        const isFailed = step.status === 'failed';
        
        return (
          <div key={step.id} className="flex flex-col items-center min-w-max">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center mb-2
              ${isCompleted ? 'bg-green-100 dark:bg-green-900' : ''}
              ${isCurrent ? 'bg-blue-100 dark:bg-blue-900 ring-2 ring-blue-400 dark:ring-blue-500' : ''}
              ${isFailed ? 'bg-red-100 dark:bg-red-900' : ''}
              ${!isCompleted && !isCurrent && !isFailed ? 'bg-gray-200 dark:bg-gray-700' : ''}
            `}>
              {isCompleted && <Check className="w-5 h-5 text-green-600 dark:text-green-400" />}
              {isCurrent && <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
              {isFailed && <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />}
              {!isCompleted && !isCurrent && !isFailed && (
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full" />
              )}
            </div>
            <p className="text-xs font-medium text-center max-w-[120px] leading-tight">
              {step.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}
