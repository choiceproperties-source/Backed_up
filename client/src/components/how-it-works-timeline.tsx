import { SearchIcon, FileText, CheckSquare, Home as HomeIcon } from 'lucide-react';

const steps = [
  { step: 1, icon: SearchIcon, title: 'Search Properties', desc: 'Filter by location, price, bedrooms and more' },
  { step: 2, icon: FileText, title: 'Submit Application', desc: 'Apply online with all required documents' },
  { step: 3, icon: CheckSquare, title: 'Get Approved', desc: 'We verify your info and landlord approves' },
  { step: 4, icon: HomeIcon, title: 'Move In', desc: 'Sign lease, get keys, move into your home' }
];

export function HowItWorksTimeline() {
  return (
    <div className="space-y-0">
      {steps.map((item, idx) => {
        const Icon = item.icon;
        return (
          <div key={idx} className="relative">
            {/* Timeline Line */}
            {idx < steps.length - 1 && (
              <div className="hidden md:block absolute left-24 top-32 w-1 h-20 bg-gradient-to-b from-secondary to-secondary/30" />
            )}

            {/* Step Container */}
            <div className="flex gap-8 items-start mb-12 md:mb-0 relative z-10">
              {/* Circle with Icon */}
              <div className="flex flex-col items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-secondary to-secondary/80 text-primary-foreground flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow">
                  <Icon className="h-8 w-8" />
                </div>
                {idx < steps.length - 1 && (
                  <div className="md:hidden h-12 w-1 bg-gradient-to-b from-secondary/50 to-secondary/10" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pt-2 pb-8 md:pb-0">
                <span className="inline-block px-4 py-1 rounded-full bg-secondary/10 text-secondary text-sm font-semibold mb-2">
                  Step {item.step}
                </span>
                <h3 className="font-heading text-2xl font-bold text-primary mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-lg">{item.desc}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
