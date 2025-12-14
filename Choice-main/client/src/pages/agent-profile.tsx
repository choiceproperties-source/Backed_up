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
} from 'lucide-react';
import { updateMetaTags } from '@/lib/seo';

export default function AgentProfile() {
  const { user, logout, isLoggedIn } = useAuth();
  const [, navigate] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
  });

  // Update meta tags
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

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant="ghost"
              className="text-white hover:bg-white/20 p-0 h-auto"
              onClick={() => navigate('/agent-dashboard')}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </div>
          <h1 className="text-3xl font-bold">Agent Profile</h1>
          <p className="text-purple-100 mt-2">Manage your profile and commission information</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <Card className="lg:col-span-1 p-8">
            <div className="text-center mb-8">
              <Avatar className="h-24 w-24 mx-auto mb-4" data-testid="avatar-profile">
                <AvatarImage src={user.profile_image || ''} alt={user.full_name || ''} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <h2 className="text-2xl font-bold text-foreground">{user.full_name || 'Agent'}</h2>
              <Badge className="mt-2" data-testid="badge-role">
                {user.role}
              </Badge>
            </div>

            {/* Account Settings */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground mb-4">Account</h3>
              <Button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                variant="outline"
                className="w-full justify-start"
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </Card>

          {/* Profile Information */}
          <Card className="lg:col-span-2 p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-foreground">Profile Information</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                data-testid="button-edit-profile"
              >
                {isEditing ? (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </>
                ) : (
                  <>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-6">
              {/* Full Name */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Full Name</label>
                {isEditing ? (
                  <Input
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="Enter full name"
                    data-testid="input-fullname"
                  />
                ) : (
                  <p className="text-muted-foreground">{formData.fullName || 'Not provided'}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Email</label>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <p>{formData.email}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
              </div>

              {/* Phone */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Phone</label>
                {isEditing ? (
                  <Input
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Enter phone number"
                    data-testid="input-phone"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <p className="text-muted-foreground">{formData.phone || 'Not provided'}</p>
                  </div>
                )}
              </div>

              {/* Bio */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">
                  Bio ({formData.bio.length}/500)
                </label>
                {isEditing ? (
                  <Textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    placeholder="Tell us about yourself"
                    maxLength={500}
                    className="resize-none"
                    data-testid="textarea-bio"
                  />
                ) : (
                  <p className="text-muted-foreground">{formData.bio || 'No bio provided'}</p>
                )}
              </div>

              {isEditing && (
                <Button
                  onClick={handleSave}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  data-testid="button-save-profile"
                >
                  Save Changes
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* Commission & License Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
          {/* Commission Info */}
          <Card className="p-8">
            <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
              <DollarSign className="h-6 w-6" />
              Commission Information
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Commission Rate</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  3-5%
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">Total Earned</p>
                <p className="text-2xl font-bold text-foreground mt-1">$0.00</p>
                <p className="text-xs text-muted-foreground mt-1">Commission earned this year</p>
              </div>
            </div>
          </Card>

          {/* License Information */}
          <Card className="p-8">
            <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
              <Award className="h-6 w-6" />
              License Information
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">License Number</p>
                <p className="text-foreground mt-1">Not provided</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">License State</p>
                <p className="text-foreground mt-1">Not provided</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">License Status</p>
                <Badge className="mt-1" data-testid="badge-license-status">
                  Unverified
                </Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}
