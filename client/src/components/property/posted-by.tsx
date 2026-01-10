import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, ExternalLink, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PostedByProps {
  owner?: {
    id: string;
    full_name: string;
    profile_image: string | null;
    role: string | null;
    display_email?: string | null;
    display_phone?: string | null;
    email?: string | null;
    is_verified?: boolean | null;
  } | null;
  poster?: {
    name: string;
    avatar: string | null;
    role_label: string;
    is_verified: boolean;
    contact: {
      email: string | null;
      phone: string | null;
    };
    agency?: {
      name: string;
      logo: string | null;
    } | null;
  } | null;
}

export function PostedBy({ owner, poster }: PostedByProps) {
  const { user } = useAuth();
  
  // Real-time sync for current user if they are the owner
  const isCurrentUserOwner = user && owner && user.id === owner.id;

  // Prefer unified poster object if available, fallback to legacy owner
  const data = poster ? {
    fullName: poster.name,
    profileImage: poster.avatar,
    roleLabel: poster.role_label,
    displayEmail: poster.contact.email,
    displayPhone: poster.contact.phone,
    isVerified: poster.is_verified,
    agency: poster.agency
  } : owner ? {
    fullName: isCurrentUserOwner ? (user.full_name || owner.full_name) : (owner.full_name || "Property Owner"),
    profileImage: isCurrentUserOwner ? (user.profile_image || owner.profile_image) : owner.profile_image,
    roleLabel: owner.role === 'agent' ? 'Listing Agent' : owner.role === 'property_manager' ? 'Property Manager' : 'Property Owner',
    displayEmail: owner.display_email || owner.email,
    displayPhone: owner.display_phone,
    isVerified: owner.is_verified,
    agency: null
  } : null;

  if (!data) return null;

  const initials = data.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  const verificationLabel = data.roleLabel.includes('Agent') ? 'Verified Agent' : 'Verified Owner';

  return (
    <div className="flex items-center justify-between gap-4 py-3 group rounded-xl">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar className="h-12 w-12 border-2 border-background shadow-sm rounded-full overflow-hidden">
            <AvatarImage src={(data.agency?.logo || data.profileImage) || undefined} alt={data.fullName} className="object-cover" />
            <AvatarFallback className="bg-blue-50 text-blue-600 text-base font-bold">
              {initials || "O"}
            </AvatarFallback>
          </Avatar>
          {data.isVerified && (
            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
              <ShieldCheck className="h-4 w-4 text-blue-600 fill-blue-50" />
            </div>
          )}
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold text-foreground leading-tight">
              {data.agency?.name || data.fullName}
            </span>
            {data.isVerified && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-50 text-[10px] font-bold text-blue-700 uppercase tracking-tight border border-blue-100 shadow-sm">
                <ShieldCheck className="h-2.5 w-2.5" />
                {verificationLabel}
              </div>
            )}
          </div>
          <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">
            {data.roleLabel}
            {isCurrentUserOwner && " (You)"}
          </span>
          {data.agency && (
            <span className="text-[10px] text-muted-foreground font-medium">
              Rep: {data.fullName}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        {data.displayPhone && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-9 w-9 rounded-full border-blue-100 text-blue-600 hover:bg-blue-50"
                  asChild
                >
                  <a href={`tel:${data.displayPhone}`}>
                    <ShieldCheck className="h-4 w-4 rotate-180" /> {/* Using ShieldCheck as placeholder for phone if icon not imported */}
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Call {data.displayPhone}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {data.displayEmail && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="hidden sm:flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-semibold rounded-full"
                  asChild
                >
                  <a href={`mailto:${data.displayEmail}`}>
                    <Mail className="h-4 w-4" />
                    <span>Contact</span>
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Send an inquiry</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}
