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
import { Mail, Phone, User, LogOut, Loader2, MapPin } from 'lucide-react';
import { updateMetaTags } from "@/lib/seo";

const profileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  location: z.string().optional(),
});

type ProfileFormInput = z.infer<typeof profileSchema>;

import { ProfileSettings } from "@/components/profile-settings";

export default function TenantProfile() {
  const { user, logout, isLoggedIn } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    updateMetaTags({
      title: "My Profile - Choice Properties",
      description: "Manage your personal profile and account settings.",
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
            <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
            <p className="text-muted-foreground mt-1">Manage your personal information and profile settings.</p>
          </div>
          <ProfileSettings />
        </div>
      </main>
      <Footer />
    </div>
  );
}
