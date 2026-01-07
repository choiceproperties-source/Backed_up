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

export default function TenantProfile() {
  const { user, logout, isLoggedIn } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

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
      title: "My Profile - Choice Properties",
      description: "Manage your personal profile and account settings.",
    });
  }, []);

  if (!isLoggedIn || !user) {
    navigate('/login');
    return null;
  }

  const onSubmit = async (data: ProfileFormInput) => {
    setIsSaving(true);
    try {
      toast({
        title: "Profile Updated",
        description: "Your settings have been saved.",
      });
    } catch (err: any) {
      toast({
        title: "Update Failed",
        description: "Unable to save profile changes.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const initials = user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="bg-gradient-to-br from-primary via-primary/90 to-secondary/80 py-12 px-6 relative overflow-hidden">
        <div className="container mx-auto max-w-6xl relative z-10">
          <h1 className="text-4xl font-bold tracking-tight text-white">Account Settings</h1>
          <p className="text-white/80 mt-2 text-lg font-medium">Manage your personal information and contact preferences.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 max-w-6xl mx-auto">
          <div className="lg:col-span-1 space-y-8">
            <Card className="p-8 rounded-xl border border-border/50 shadow-xl text-center">
              <Avatar className="h-14 w-14 mx-auto mb-6 border-4 border-background shadow-2xl transition-transform hover:scale-105">
                <AvatarImage src={user.profile_image || undefined} alt={user.full_name || ''} />
                <AvatarFallback className="text-xl font-bold bg-primary/5">{initials}</AvatarFallback>
              </Avatar>
              <h2 className="text-3xl font-bold mb-2 tracking-tight">{user.full_name || 'Tenant'}</h2>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-8">Verified Resident</p>
              
              <div className="space-y-4 pt-8 border-t border-primary/10">
                <div className="flex items-center gap-4 text-sm font-medium p-3 rounded-xl bg-muted/30 border border-border/50">
                  <Mail className="h-4 w-4 text-primary" strokeWidth={1.5} />
                  <span className="truncate flex-1 font-medium">{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-4 text-sm font-medium p-3 rounded-xl bg-muted/30 border border-border/50">
                    <Phone className="h-4 w-4 text-primary" strokeWidth={1.5} />
                    <span className="flex-1 font-medium">{user.phone}</span>
                  </div>
                )}
                <div className="text-xs text-muted-foreground/60 pt-4 font-medium italic">
                  Member since {new Date(user.created_at).toLocaleDateString()}
                </div>
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
              <h3 className="text-2xl font-bold mb-8 pb-4 border-b tracking-tight">Personal Information</h3>

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
                              placeholder="John Doe"
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
                          <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Current City</FormLabel>
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
                        <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">About You</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Share a bit about yourself with potential landlords..."
                            disabled={isSaving}
                            className="min-h-[160px] bg-muted/30 border-border/50 resize-none p-4"
                            data-testid="textarea-bio"
                            {...field}
                          />
                        </FormControl>
                        <p className="text-xs font-medium text-muted-foreground/60 mt-2 text-right">
                          {field.value?.length || 0}/500 characters
                        </p>
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
                        Saving Profile...
                      </>
                    ) : (
                      'Save All Changes'
                    )}
                  </Button>
                </form>
              </Form>
            </Card>

            <Card className="p-8 rounded-xl border border-border/50 shadow-sm">
              <h3 className="text-xl font-bold mb-6 tracking-tight">Account Privacy</h3>
              <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-foreground tracking-tight">Email Notifications</p>
                  <Button variant="ghost" size="sm" className="font-bold text-primary h-9" disabled>Manage</Button>
                </div>
                <p className="text-sm text-muted-foreground/80 font-medium leading-relaxed">
                  We use your email for critical account updates and lease communications. 
                  Privacy settings can be customized in the notification center.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
