import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

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
    <div className="flex items-center gap-3 py-2">
      <Avatar className="h-8 w-8 border border-gray-100 dark:border-gray-800">
        <AvatarImage src={profileImage || undefined} alt={fullName} />
        <AvatarFallback className="bg-blue-50 text-blue-600 text-xs font-bold">
          {initials || "O"}
        </AvatarFallback>
      </Avatar>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-900 dark:text-white">
          {fullName}
        </span>
        {role && (
          <Badge variant="secondary" className="text-[10px] uppercase px-1.5 h-4 font-bold bg-gray-100 dark:bg-gray-800 text-gray-500 border-none">
            {role === 'agent' ? 'Agent' : 'Landlord'}
          </Badge>
        )}
      </div>
    </div>
  );
}
