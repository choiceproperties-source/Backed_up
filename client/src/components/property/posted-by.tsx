import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface PostedByProps {
  fullName: string;
  profileImage: string | null;
  role: string | null;
}

export function PostedBy({ fullName, profileImage, role }: PostedByProps) {
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  return (
    <div className="flex items-center gap-3 py-2 transition-colors hover:bg-muted/50 rounded-lg pr-3">
      <Avatar className="h-10 w-10 border border-muted shadow-sm rounded-full">
        <AvatarImage src={profileImage || undefined} alt={fullName} />
        <AvatarFallback className="bg-blue-50 text-blue-600 text-sm font-bold">
          {initials || "O"}
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col justify-center">
        <span className="text-sm font-medium text-foreground leading-none">
          {fullName}
        </span>
        {role && (
          <span className="text-xs text-muted-foreground mt-1">
            {role === 'agent' ? 'Listing Agent' : 'Property Owner'}
          </span>
        )}
      </div>
    </div>
  );
}
