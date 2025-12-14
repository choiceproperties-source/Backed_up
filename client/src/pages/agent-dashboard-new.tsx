import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { useAuth } from '@/lib/auth-context';
import { useProperties } from '@/hooks/use-properties';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Home,
  FileText,
  LogOut,
  CheckCircle,
  Clock,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { updateMetaTags } from '@/lib/seo';

export default function AgentDashboard() {
  const { user, logout, isLoggedIn } = useAuth();
  const [, navigate] = useLocation();
  const { properties, loading } = useProperties();

  // Update meta tags
  useMemo(() => {
    updateMetaTags({
      title: 'Agent Dashboard - Choice Properties',
      description: 'Manage your assigned properties and applications',
      image: 'https://choiceproperties.com/og-image.png',
      url: 'https://choiceproperties.com/agent-dashboard',
    });
  }, []);

  // Filter properties assigned to this agent
  const assignedProperties = properties.filter(
    (p: any) => p.listingAgentId === user?.id
  );

  // Calculate stats
  const stats = useMemo(
    () => ({
      assignedProperties: assignedProperties.length,
      activeListings: assignedProperties.filter((p: any) => p.status === 'active').length,
      totalApplications: assignedProperties.reduce((sum: number, p: any) => sum + (p.applicationsCount || 0), 0),
      pendingApps: assignedProperties.reduce((sum: number, p: any) => sum + (p.pendingApplicationsCount || 0), 0),
    }),
    [assignedProperties]
  );

  if (!isLoggedIn || !user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Hero Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-12">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">Agent Dashboard</h1>
            <p className="text-purple-100 mt-2">Manage your assigned properties and applications</p>
          </div>
          <Button
            onClick={() => {
              logout();
              navigate('/');
            }}
            variant="ghost"
            className="text-white hover:bg-white/20"
            data-testid="button-logout"
          >
            <LogOut className="h-5 w-5 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="container mx-auto px-4 -mt-8 relative z-10 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6" data-testid="stat-assigned-properties">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Assigned Properties</p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                  {stats.assignedProperties}
                </p>
              </div>
              <Home className="h-8 w-8 text-purple-500 opacity-20" />
            </div>
          </Card>

          <Card className="p-6" data-testid="stat-active-listings">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Active Listings</p>
                <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">
                  {stats.activeListings}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-indigo-500 opacity-20" />
            </div>
          </Card>

          <Card className="p-6" data-testid="stat-total-applications">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Total Applications</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                  {stats.totalApplications}
                </p>
              </div>
              <FileText className="h-8 w-8 text-green-500 opacity-20" />
            </div>
          </Card>

          <Card className="p-6" data-testid="stat-pending">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Pending Review</p>
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">
                  {stats.pendingApps}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500 opacity-20" />
            </div>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 flex-1 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quick Actions */}
          <Card className="p-8" data-testid="section-quick-actions">
            <h2 className="text-2xl font-bold text-foreground mb-6">Quick Actions</h2>
            <div className="space-y-4">
              <Button
                onClick={() => navigate('/agent-properties')}
                className="w-full justify-between bg-purple-600 hover:bg-purple-700"
                data-testid="button-manage-properties"
              >
                <span className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Manage Properties
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => navigate('/agent-applications')}
                className="w-full justify-between bg-indigo-600 hover:bg-indigo-700"
                data-testid="button-view-applications"
              >
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  View Applications
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => navigate('/agent-profile')}
                variant="outline"
                className="w-full justify-between"
                data-testid="button-profile"
              >
                <span>My Profile & Commission</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>

          {/* Overview */}
          <Card className="p-8" data-testid="section-overview">
            <h2 className="text-2xl font-bold text-foreground mb-6">Overview</h2>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                Welcome to your agent dashboard! From here you can manage all your assigned properties,
                review tenant applications, and track your commission.
              </p>
              <p>
                • View and manage assigned properties • Review tenant applications • Track commission earnings •
                Update your profile and license information
              </p>
              <p className="text-xs text-muted-foreground italic mt-4">
                Last updated: {new Date().toLocaleDateString()}
              </p>
            </div>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}
