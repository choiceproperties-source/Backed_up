import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PostedByProps {
  fullName: string;
  profileImage: string | null;
  role: string | null;
  displayEmail?: string | null;
}

export function PostedBy({ fullName, profileImage, role, displayEmail }: PostedByProps) {
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  return (
    <div className="flex items-center justify-between gap-4 py-3 group rounded-xl">
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12 border-2 border-background shadow-sm rounded-full">
          <AvatarImage src={profileImage || undefined} alt={fullName} />
          <AvatarFallback className="bg-blue-50 text-blue-600 text-base font-bold">
            {initials || "O"}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="text-base font-bold text-foreground leading-tight">
            {fullName}
          </span>
          <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">
            {role === 'agent' ? 'Listing Agent' : 'Property Owner'}
          </span>
        </div>
      </div>

      {displayEmail && (
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
      )}
    </div>
  );
}
