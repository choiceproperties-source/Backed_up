import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { useAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  LogOut,
  Mail,
  Phone,
  Briefcase,
  DollarSign,
  Award,
  Edit2,
  Save,
  Star,
  TrendingUp,
  MapPin,
  CheckCircle2,
  Copy,
  Check,
} from 'lucide-react';
import { updateMetaTags } from '@/lib/seo';
import { useQuery } from '@tanstack/react-query';

import { ProfileSettings } from "@/components/profile-settings";

export default function AgentProfile() {
  const { user, logout, isLoggedIn } = useAuth();
  const [, navigate] = useLocation();

  useMemo(() => {
    updateMetaTags({
      title: 'Agent Profile - Choice Properties',
      description: 'View and edit your agent profile',
    });
  }, []);

  if (!isLoggedIn || !user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Agent Profile</h1>
            <p className="text-muted-foreground mt-1">Personalize your public profile and manage account details.</p>
          </div>
          <ProfileSettings />
        </div>
      </main>
      <Footer />
    </div>
  );
}
