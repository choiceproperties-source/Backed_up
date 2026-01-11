import { Loader2, Check, AlertCircle, Cloud } from "lucide-react";
import { cn } from "@/lib/utils";

interface AutosaveIndicatorProps {
  status: 'idle' | 'saving' | 'saved' | 'error';
  className?: string;
}

export function AutosaveIndicator({ status, className }: AutosaveIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-full transition-all duration-300", className)}>
      <div className="relative">
        <Cloud className={cn("h-3.5 w-3.5 transition-colors duration-300", 
          status === 'saving' ? "text-primary animate-pulse" : 
          status === 'saved' ? "text-green-500" : 
          status === 'error' ? "text-destructive" : "text-gray-400"
        )} />
        {status === 'saving' && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary absolute inset-0 opacity-50" />
        )}
      </div>
      
      <span className={cn("text-[10px] font-black uppercase tracking-widest transition-colors duration-300",
        status === 'saving' ? "text-primary" : 
        status === 'saved' ? "text-green-600 dark:text-green-400" : 
        status === 'error' ? "text-destructive" : "text-gray-500"
      )}>
        {status === 'saving' ? "Syncing..." : 
         status === 'saved' ? "Draft Saved" : 
         status === 'error' ? "Sync Error" : "Cloud Ready"}
      </span>

      {status === 'saved' && <Check className="h-2.5 w-2.5 text-green-500 animate-in zoom-in duration-300" />}
      {status === 'error' && <AlertCircle className="h-2.5 w-2.5 text-destructive animate-bounce" />}
    </div>
  );
}
