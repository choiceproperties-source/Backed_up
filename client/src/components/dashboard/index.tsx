import { ReactNode } from 'react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { LogOut, LucideIcon } from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle: string;
  gradient?: string;
  onLogout?: () => void;
  actions?: ReactNode;
  loading?: boolean;
  skeleton?: ReactNode;
}

export function DashboardLayout({
  children,
  title,
  subtitle,
  gradient = 'from-primary to-secondary',
  onLogout,
  actions,
  loading,
  skeleton,
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <DashboardHero
        title={title}
        subtitle={subtitle}
        gradient={gradient}
        onLogout={onLogout}
        actions={actions}
      />
      <main className="flex-1">
        {loading && skeleton ? skeleton : children}
      </main>
      <Footer />
    </div>
  );
}

interface DashboardHeroProps {
  title: string;
  subtitle: string;
  gradient?: string;
  onLogout?: () => void;
  actions?: ReactNode;
}

export function DashboardHero({
  title,
  subtitle,
  gradient = 'from-primary to-secondary',
  onLogout,
  actions,
}: DashboardHeroProps) {
  return (
    <div className={cn('bg-gradient-to-r text-white py-12', gradient)} data-testid="dashboard-hero">
      <div className="container mx-auto px-4 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold" data-testid="dashboard-title">{title}</h1>
          <p className="text-white/80 mt-2" data-testid="dashboard-subtitle">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {actions}
          {onLogout && (
            <Button
              onClick={onLogout}
              variant="outline"
              data-testid="button-logout"
            >
              <LogOut className="h-5 w-5 mr-2" />
              Sign Out
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: { value: number; label: string };
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-primary',
  trend,
  onClick,
}: StatCardProps) {
  return (
    <Card
      className={cn('p-6', onClick && 'cursor-pointer hover-elevate')}
      onClick={onClick}
      data-testid={`stat-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0 flex-1">
          <p className="text-sm text-muted-foreground truncate">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <p className={cn(
              'text-xs flex items-center gap-1',
              trend.value >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              <span>{trend.value >= 0 ? '+' : ''}{trend.value}%</span>
              <span className="text-muted-foreground">{trend.label}</span>
            </p>
          )}
        </div>
        <div className={cn('p-2 rounded-lg bg-muted flex-shrink-0', iconColor)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

interface StatsGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4 | 5;
}

export function StatsGrid({ children, columns = 4 }: StatsGridProps) {
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
    5: 'md:grid-cols-3 lg:grid-cols-5',
  };
  
  return (
    <div className={cn('grid grid-cols-1 gap-4', gridCols[columns])} data-testid="stats-grid">
      {children}
    </div>
  );
}

interface TabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

interface TabShellProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  children: ReactNode;
}

export function TabShell({ tabs, activeTab, onTabChange, children }: TabShellProps) {
  return (
    <div className="space-y-6" data-testid="tab-shell">
      <div className="flex flex-wrap gap-2 border-b pb-4" data-testid="tab-navigation">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <Button
              key={tab.id}
              variant={isActive ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onTabChange(tab.id)}
              className="gap-2"
              data-testid={`tab-${tab.id}`}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {tab.label}
              {typeof tab.count === 'number' && (
                <Badge variant="secondary" className="ml-1">
                  {tab.count}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>
      <div data-testid="tab-content">{children}</div>
    </div>
  );
}

interface ViewToggleProps {
  view: 'grid' | 'list';
  onViewChange: (view: 'grid' | 'list') => void;
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex rounded-lg border overflow-hidden" data-testid="view-toggle">
      <Button
        variant={view === 'grid' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('grid')}
        className="rounded-none"
        data-testid="button-view-grid"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      </Button>
      <Button
        variant={view === 'list' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('list')}
        className="rounded-none"
        data-testid="button-view-list"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </Button>
    </div>
  );
}

interface SortSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

export function SortSelect({ value, onChange, options }: SortSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
      data-testid="select-sort"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function EmptyDashboardState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="p-12 text-center" data-testid="empty-dashboard-state">
      <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4 max-w-md mx-auto">{description}</p>
      {action}
    </Card>
  );
}
