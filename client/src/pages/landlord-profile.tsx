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

export default function LandlordProfile() {
  const { user, logout, isLoggedIn } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const { data: propertiesCount } = useQuery<number>({
    queryKey: [`/api/properties/count`, { ownerId: user?.id }],
    enabled: !!user?.id,
  });

  const handleCopyEmail = () => {
    if (user?.email) {
      navigator.clipboard.writeText(user.email);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  const form = useForm<ProfileFormInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.full_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      bio: user?.bio || '',
      location: user?.location || '',
    },
  });

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

  const onSubmit = async (data: ProfileFormInput) => {
    setIsSaving(true);
    try {
      toast({
        title: 'Profile Updated',
        description: 'Your changes have been saved successfully.',
      });
    } catch (err: any) {
      toast({
        title: 'Update Failed',
        description: err.message || 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const initials = user?.full_name?.split(' ').map((n) => n[0]).join('').toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="bg-gradient-to-br from-primary via-primary/90 to-secondary/80 py-12 px-6 relative overflow-hidden">
        <div className="container mx-auto relative z-10 flex items-center gap-6">
          <Button
            onClick={() => navigate('/landlord-dashboard')}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 h-11 font-medium border border-white/30"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={1.5} />
            Dashboard
          </Button>
          <div className="flex-1">
            <h1 className="text-4xl font-bold tracking-tight text-white">My Profile</h1>
            <p className="text-white/80 mt-2 text-lg font-medium">Manage your professional identity and contact preferences.</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 max-w-6xl mx-auto">
          <div className="lg:col-span-1 space-y-8">
            <Card className="p-8 rounded-xl border border-border/50 shadow-xl text-center">
                <div className="relative inline-block mb-6 group">
                  <Avatar className="h-20 w-20 mx-auto border-4 border-background shadow-2xl transition-transform group-hover:scale-105" data-testid="avatar-profile">
                    <AvatarImage src={user.profile_image || undefined} alt={user.full_name || ''} />
                    <AvatarFallback className="text-xl font-bold bg-primary/5">{initials}</AvatarFallback>
                  </Avatar>
                  {user.license_verified && (
                    <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1 shadow-lg ring-2 ring-background">
                      <CheckCircle2 className="h-5 w-5" strokeWidth={1.5} />
                    </div>
                  )}
                </div>

              <h2 className="text-3xl font-bold mb-2 tracking-tight">{user.full_name || 'Landlord'}</h2>
              <div className="flex justify-center gap-1 mb-4">
                {user.rating ? (
                  <div className="flex items-center gap-1 bg-yellow-400/10 text-yellow-600 px-3 py-1 rounded-full text-sm font-bold">
                    <Star className="h-4 w-4 fill-current" />
                    {user.rating} ({user.review_count || 0})
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm font-medium">New Partner</span>
                )}
              </div>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-8">Verified Property Owner</p>
              
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-xl hover:shadow-md transition-shadow duration-300 mb-8">
                <div className="text-center p-2 border-r border-primary/10">
                  <p className="text-2xl font-bold text-primary tracking-tight">{propertiesCount || 0}</p>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Properties</p>
                </div>
                <div className="text-center p-2">
                  <p className="text-2xl font-bold text-primary tracking-tight">{user.years_experience || 0}</p>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Years Exp.</p>
                </div>
              </div>

              <div className="space-y-4 pt-8 border-t border-primary/10">
                <div className="flex items-center gap-4 text-sm font-medium p-3 rounded-xl bg-muted/30 group border border-border/50">
                  <Mail className="h-4 w-4 text-primary" strokeWidth={1.5} />
                  <span className="truncate flex-1 font-medium">{user.display_email || user.email}</span>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-8 w-8 hover:bg-background"
                    onClick={handleCopyEmail}
                    data-testid="button-copy-email"
                  >
                    {copiedEmail ? <Check className="h-4 w-4 text-green-500" strokeWidth={1.5} /> : <Copy className="h-4 w-4" strokeWidth={1.5} />}
                  </Button>
                </div>
                {user.display_phone && (
                  <div className="flex items-center gap-4 text-sm font-medium p-3 rounded-xl bg-muted/30 border border-border/50">
                    <Phone className="h-4 w-4 text-primary" strokeWidth={1.5} />
                    <span className="flex-1 font-medium">{user.display_phone}</span>
                  </div>
                )}
              </div>
            </Card>

            <Button
              onClick={logout}
              variant="outline"
              className="w-full h-11 font-medium text-destructive hover:bg-destructive/10 border-border/60 shadow-sm"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-2" strokeWidth={1.5} />
              Sign Out
            </Button>
          </div>

          <div className="lg:col-span-2 space-y-8">
            <Card className="p-8 rounded-xl border border-border/50 shadow-sm">
              <h3 className="text-2xl font-bold mb-8 pb-4 border-b tracking-tight">Profile Settings</h3>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Full Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="John Smith"
                              disabled={isSaving}
                              className="h-11 bg-muted/30 border-border/50"
                              data-testid="input-fullname"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Base Location</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. San Francisco, CA"
                              disabled={isSaving}
                              className="h-11 bg-muted/30 border-border/50"
                              data-testid="input-location"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Professional Bio</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your property management experience or rental philosophy..."
                            disabled={isSaving}
                            className="min-h-[160px] bg-muted/30 border-border/50 resize-none p-4"
                            data-testid="textarea-bio"
                            {...field}
                          />
                        </FormControl>
                        <div className="flex justify-between items-center mt-2">
                          <p className="text-xs font-medium text-muted-foreground/60">
                            {field.value?.length || 0}/500 characters
                          </p>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="w-full h-11 text-base font-medium shadow-lg shadow-primary/20"
                    data-testid="button-save-profile"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" strokeWidth={1.5} />
                        Saving Changes...
                      </>
                    ) : (
                      'Update Profile'
                    )}
                  </Button>
                </form>
              </Form>
            </Card>

            <Card className="p-8 rounded-xl border border-border/50 shadow-sm">
              <h3 className="text-xl font-bold mb-6 tracking-tight">Security & Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50 group transition-colors hover:bg-muted/50">
                  <div className="flex-1">
                    <p className="font-bold text-foreground mb-1 tracking-tight">Account Password</p>
                    <p className="text-xs text-muted-foreground/60 font-medium">Last changed 3 months ago</p>
                  </div>
                  <Button variant="ghost" size="sm" className="font-bold text-primary h-9" disabled>Update</Button>
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50 group transition-colors hover:bg-muted/50">
                  <div className="flex-1">
                    <p className="font-bold text-foreground mb-1 tracking-tight">Email Visibility</p>
                    <p className="text-xs text-muted-foreground/60 font-medium">Public profile active</p>
                  </div>
                  <Button variant="ghost" size="sm" className="font-bold text-primary h-9" disabled>Manage</Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
