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

export default function AgentProfile() {
  const { user, logout, isLoggedIn } = useAuth();
  const [, navigate] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
    location: user?.location || '',
  });

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

  useMemo(() => {
    updateMetaTags({
      title: 'Agent Profile - Choice Properties',
      description: 'View and edit your agent profile',
    });
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = () => {
    setIsEditing(false);
  };

  if (!isLoggedIn || !user) {
    navigate('/login');
    return null;
  }

  const initials = ((user.full_name || user.email || '') as string).split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="bg-gradient-to-br from-primary via-primary/90 to-secondary/80 py-12 px-6 relative overflow-hidden mb-12">
        <div className="container mx-auto relative z-10">
          <div className="flex items-center gap-2 mb-8">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 h-11 font-medium border border-white/30"
              onClick={() => navigate('/agent-dashboard')}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" strokeWidth={1.5} />
              Dashboard
            </Button>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white">Profile Settings</h1>
          <p className="text-white/80 mt-2 text-lg font-medium">Personalize your public profile and manage account details.</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-1 space-y-8">
            <Card className="p-8 rounded-xl border border-border/50 shadow-xl">
              <div className="text-center">
                <div className="relative inline-block mb-6 group">
                  <Avatar className="h-14 w-14 mx-auto border-4 border-background shadow-2xl transition-transform group-hover:scale-105" data-testid="avatar-profile">
                    <AvatarImage src={user.profile_image || undefined} alt={user.full_name || ''} />
                    <AvatarFallback className="text-xl font-bold bg-primary/5">{initials}</AvatarFallback>
                  </Avatar>
                  {user.license_verified && (
                    <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground rounded-full p-1 shadow-lg ring-2 ring-background">
                      <CheckCircle2 className="h-6 w-6" strokeWidth={1.5} />
                    </div>
                  )}
                </div>
                <h2 className="text-3xl font-bold mb-2 tracking-tight">{user.full_name || 'Agent'}</h2>
                <div className="flex justify-center gap-1 mb-4">
                  {user.rating ? (
                    <div className="flex items-center gap-1 bg-yellow-400/10 text-yellow-600 px-3 py-1 rounded-full text-sm font-bold">
                      <Star className="h-4 w-4 fill-current" />
                      {user.rating} ({user.review_count || 0})
                    </div>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground rounded-full px-2 py-0.5 font-semibold">New Agent</Badge>
                  )}
                </div>
                <Badge variant="secondary" className="rounded-full px-4 py-1 text-sm font-medium" data-testid="badge-role">
                  {user.role === 'agent' ? 'Licensed Real Estate Agent' : user.role}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-10 p-4 bg-muted/50 rounded-xl hover:shadow-md transition-shadow duration-300">
                <div className="text-center p-2 border-r">
                  <p className="text-2xl font-bold text-primary tracking-tight">{propertiesCount || 0}</p>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Active</p>
                </div>
                <div className="text-center p-2">
                  <p className="text-2xl font-bold text-primary tracking-tight">{user.years_experience || 0}</p>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Years Exp.</p>
                </div>
              </div>

              <div className="mt-10 pt-8 border-t">
                <Button
                  onClick={logout}
                  variant="ghost"
                  className="w-full justify-center text-destructive hover:text-destructive hover:bg-destructive/10 h-11 font-medium"
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4 mr-2" strokeWidth={1.5} />
                  Sign Out
                </Button>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-8">
            <Card className="p-8 rounded-xl border border-border/50 shadow-sm">
              <div className="flex justify-between items-center mb-8 pb-4 border-b">
                <h2 className="text-2xl font-bold tracking-tight">Personal Information</h2>
                <Button
                  variant={isEditing ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  data-testid="button-edit-profile"
                  className="h-11 font-medium border-border/60"
                >
                  {isEditing ? (
                    <>
                      <Save className="h-4 w-4 mr-2" strokeWidth={1.5} />
                      Save Profile
                    </>
                  ) : (
                    <>
                      <Edit2 className="h-4 w-4 mr-2" strokeWidth={1.5} />
                      Edit Profile
                    </>
                  )}
                </Button>
              </div>

              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Full Name</label>
                    {isEditing ? (
                      <Input
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        className="h-11 bg-muted/30 border-border/50"
                        placeholder="John Doe"
                        data-testid="input-fullname"
                      />
                    ) : (
                      <p className="text-lg font-medium">{formData.fullName || 'Not specified'}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Location</label>
                    {isEditing ? (
                      <Input
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        className="h-11 bg-muted/30 border-border/50"
                        placeholder="e.g. New York, NY"
                        data-testid="input-location"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" strokeWidth={1.5} />
                        <p className="text-lg font-medium">{formData.location || 'Not specified'}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Public Contact Email</label>
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/50 group">
                    <Mail className="h-5 w-5 text-primary" strokeWidth={1.5} />
                    <p className="flex-1 font-medium">{user.display_email || user.email}</p>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-10 w-10 hover:bg-background"
                      onClick={handleCopyEmail}
                      data-testid="button-copy-email"
                    >
                      {copiedEmail ? <Check className="h-4 w-4 text-green-500" strokeWidth={1.5} /> : <Copy className="h-4 w-4" strokeWidth={1.5} />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground/60 mt-2 font-medium">This email is visible on your public property listings.</p>
                </div>

                <div>
                  <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 block">About You</label>
                  {isEditing ? (
                    <Textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleInputChange}
                      placeholder="Share your experience and approach to real estate..."
                      maxLength={500}
                      className="min-h-[160px] bg-muted/30 border-border/50 resize-none p-4"
                      data-testid="textarea-bio"
                    />
                  ) : (
                    <p className="text-muted-foreground leading-relaxed text-lg">
                      {formData.bio || 'No professional biography provided yet.'}
                    </p>
                  )}
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="p-8 rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-600">
                    <DollarSign className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-xl font-bold tracking-tight">Earnings</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Sales Volume</p>
                    <p className="text-3xl font-bold mt-1 tracking-tight">
                      ${(user.total_sales || 0).toLocaleString()}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground/60 font-medium">Sales volume tracked through Choice Properties.</p>
                </div>
              </Card>

              <Card className="p-8 rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
                    <Award className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-xl font-bold tracking-tight">Certification</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">License Number</p>
                    <p className="text-lg font-bold mt-1 font-mono tracking-wider">{user.license_number || 'PENDING'}</p>
                  </div>
                  <Badge variant={user.license_verified ? "default" : "secondary"} className="rounded-full px-3 py-1 font-bold">
                    {user.license_verified ? "License Verified" : "Verification Pending"}
                  </Badge>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
