import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { useAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Phone, User, LogOut, Loader2, ArrowLeft, Star, Home, Users, Clock, CheckCircle2, Copy, Check, TrendingUp, MapPin } from 'lucide-react';
import { updateMetaTags } from '@/lib/seo';
import { useQuery } from '@tanstack/react-query';

const profileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  location: z.string().optional(),
});

type ProfileFormInput = z.infer<typeof profileSchema>;

import { ProfileSettings } from "@/components/profile-settings";

export default function LandlordProfile() {
  const { user, logout, isLoggedIn } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    updateMetaTags({
      title: 'Profile Settings - Choice Properties',
      description: 'Manage your professional landlord profile and settings',
    });
  }, []);

  if (!isLoggedIn || !user || (user.role !== 'landlord' && user.role !== 'property_manager' && user.role !== 'admin')) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Landlord Profile</h1>
              <p className="text-muted-foreground mt-1">Manage your professional identity and account settings.</p>
            </div>
            <Button
              onClick={() => navigate('/landlord-dashboard')}
              variant="outline"
              size="sm"
              className="h-10 border-border/60"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
          </div>
          <ProfileSettings />
        </div>
      </main>
      <Footer />
    </div>
  );
}
