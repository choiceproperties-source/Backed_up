import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, ExternalLink, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PostedByProps {
  owner: {
    full_name: string;
    profile_image: string | null;
    role: string | null;
    display_email?: string | null;
    email?: string | null;
    is_verified?: boolean | null;
  } | null;
  organization?: {
    name: string;
    logo: string | null;
  } | null;
}

export function PostedBy({ owner, organization }: PostedByProps) {
  if (organization) {
    return (
      <div className="flex items-center justify-between gap-4 py-3 group rounded-xl">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-12 w-12 border-2 border-background shadow-sm rounded-full">
              <AvatarImage src={organization.logo || undefined} alt={organization.name} />
              <AvatarFallback className="bg-blue-50 text-blue-600 text-base font-bold">
                {organization.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold text-foreground leading-tight">
              {organization.name}
            </span>
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">
              Managed by
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (!owner) return null;

  const fullName = owner.full_name || "Property Owner";
  const profileImage = owner.profile_image;
  const role = owner.role;
  const displayEmail = owner.display_email || owner.email;
  const isVerified = owner.is_verified;

  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  const roleLabel = role === 'landlord' ? 'Posted by Property Owner' : role === 'manager' ? 'Posted by Property Manager' : 'Property Owner';
  const verificationLabel = role === 'agent' ? 'Verified Agent' : 'Verified Owner';

  return (
    <div className="flex items-center justify-between gap-4 py-3 group rounded-xl">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar className="h-12 w-12 border-2 border-background shadow-sm rounded-full">
            <AvatarImage src={profileImage || undefined} alt={fullName} />
            <AvatarFallback className="bg-blue-50 text-blue-600 text-base font-bold">
              {initials || "O"}
            </AvatarFallback>
          </Avatar>
          {isVerified && (
            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
              <ShieldCheck className="h-4 w-4 text-blue-600 fill-blue-50" />
            </div>
          )}
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold text-foreground leading-tight">
              {fullName}
            </span>
            {isVerified && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-50 text-[10px] font-bold text-blue-700 uppercase tracking-tight border border-blue-100 shadow-sm">
                <ShieldCheck className="h-2.5 w-2.5" />
                {verificationLabel}
              </div>
            )}
          </div>
          <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">
            {roleLabel}
          </span>
        </div>
      </div>

      {displayEmail && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="hidden sm:flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-semibold rounded-full"
                asChild
              >
                <a href={`mailto:${displayEmail}`}>
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
  );
}
