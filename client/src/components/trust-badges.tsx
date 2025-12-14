import { Shield, Star, Users, Award, CheckCircle, Clock } from 'lucide-react';

interface TrustBadgeProps {
  variant?: 'hero' | 'inline' | 'card';
  className?: string;
}

export function TrustBadges({ variant = 'hero', className = '' }: TrustBadgeProps) {
  const badges = [
    { icon: Star, label: '4.9/5 Rating', value: '2000+ Reviews' },
    { icon: Users, label: 'Happy Renters', value: '10,000+' },
    { icon: Shield, label: 'Verified', value: '100% Safe' },
  ];

  if (variant === 'hero') {
    return (
      <div className={`flex flex-wrap justify-center gap-4 md:gap-8 ${className}`}>
        {badges.map((badge, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20"
            data-testid={`trust-badge-${idx}`}
          >
            <badge.icon className="w-4 h-4 text-secondary" aria-hidden="true" />
            <span className="text-sm font-medium text-white">{badge.label}</span>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`flex flex-wrap items-center gap-6 ${className}`}>
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            ))}
          </div>
          <span className="text-sm text-muted-foreground">4.9 out of 5</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span className="text-sm text-muted-foreground">Verified Listings</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-500" />
          <span className="text-sm text-muted-foreground">48hr Approval</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
      {[
        { icon: Shield, title: 'Secure', desc: '256-bit encryption' },
        { icon: Award, title: 'Trusted', desc: 'Industry leader' },
        { icon: Users, title: 'Community', desc: '10,000+ renters' },
        { icon: CheckCircle, title: 'Verified', desc: 'All listings' },
      ].map((item, idx) => (
        <div
          key={idx}
          className="flex flex-col items-center text-center p-4 rounded-xl bg-muted/50"
        >
          <item.icon className="w-8 h-8 text-secondary mb-2" />
          <h4 className="font-semibold text-sm">{item.title}</h4>
          <p className="text-xs text-muted-foreground">{item.desc}</p>
        </div>
      ))}
    </div>
  );
}

export function CredibilityBar({ className = '' }: { className?: string }) {
  const partners = [
    { name: 'SSL Secured', icon: Shield },
    { name: 'BBB Accredited', icon: Award },
    { name: 'Equal Housing', icon: Users },
    { name: 'Fair Housing', icon: CheckCircle },
  ];

  return (
    <section className={`py-8 bg-muted/30 border-y border-border ${className}`}>
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
          {partners.map((partner, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 text-muted-foreground opacity-70 hover:opacity-100 transition-opacity"
            >
              <partner.icon className="w-5 h-5" />
              <span className="text-sm font-medium">{partner.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
