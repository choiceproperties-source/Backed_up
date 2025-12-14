import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  ShieldCheck, Camera, UserCheck, Clock, Star, 
  CheckCircle2, Award, ThumbsUp, Zap, Home
} from "lucide-react";

interface EnhancedTrustBadgesProps {
  isVerifiedListing?: boolean;
  hasVerifiedPhotos?: boolean;
  isVerifiedOwner?: boolean;
  responseTime?: string;
  responseRate?: number;
  yearsOnPlatform?: number;
  totalListings?: number;
  averageRating?: number;
  totalReviews?: number;
}

export function EnhancedTrustBadges({
  isVerifiedListing = true,
  hasVerifiedPhotos = true,
  isVerifiedOwner = true,
  responseTime = "within 2 hours",
  responseRate = 98,
  yearsOnPlatform = 3,
  totalListings = 12,
  averageRating = 4.8,
  totalReviews = 47,
}: EnhancedTrustBadgesProps) {
  return (
    <Card className="border-0 shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-3">
        <div className="flex items-center gap-2 text-white">
          <ShieldCheck className="h-5 w-5" />
          <span className="font-semibold">Verified & Trusted</span>
        </div>
      </div>
      <CardContent className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                className={`flex flex-col items-center p-3 rounded-lg transition-colors ${
                  isVerifiedListing 
                    ? 'bg-green-50 dark:bg-green-900/20 cursor-help' 
                    : 'bg-gray-50 dark:bg-gray-800 opacity-50'
                }`}
                data-testid="badge-verified-listing"
              >
                <CheckCircle2 className={`h-6 w-6 mb-1 ${isVerifiedListing ? 'text-green-600' : 'text-gray-400'}`} />
                <span className="text-xs text-center font-medium">Verified Listing</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>This listing has been verified by our team</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                className={`flex flex-col items-center p-3 rounded-lg transition-colors ${
                  hasVerifiedPhotos 
                    ? 'bg-blue-50 dark:bg-blue-900/20 cursor-help' 
                    : 'bg-gray-50 dark:bg-gray-800 opacity-50'
                }`}
                data-testid="badge-verified-photos"
              >
                <Camera className={`h-6 w-6 mb-1 ${hasVerifiedPhotos ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className="text-xs text-center font-medium">Verified Photos</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Photos are recent and accurately represent the property</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                className={`flex flex-col items-center p-3 rounded-lg transition-colors ${
                  isVerifiedOwner 
                    ? 'bg-purple-50 dark:bg-purple-900/20 cursor-help' 
                    : 'bg-gray-50 dark:bg-gray-800 opacity-50'
                }`}
                data-testid="badge-verified-owner"
              >
                <UserCheck className={`h-6 w-6 mb-1 ${isVerifiedOwner ? 'text-purple-600' : 'text-gray-400'}`} />
                <span className="text-xs text-center font-medium">Verified Owner</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Property owner identity has been verified</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 border-t dark:border-gray-800">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
            <Zap className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="text-xs text-muted-foreground">Response Time</p>
              <p className="text-sm font-semibold capitalize">{responseTime}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
            <ThumbsUp className="h-5 w-5 text-orange-600" />
            <div>
              <p className="text-xs text-muted-foreground">Response Rate</p>
              <p className="text-sm font-semibold">{responseRate}%</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t dark:border-gray-800">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span className="font-bold">{averageRating.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">({totalReviews})</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Award className="h-4 w-4" />
              <span>{yearsOnPlatform}+ years</span>
            </div>
            <div className="flex items-center gap-1">
              <Home className="h-4 w-4" />
              <span>{totalListings} listings</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TrustBadgeInline({ 
  variant = "verified" 
}: { 
  variant: "verified" | "photos" | "owner" | "responsive" 
}) {
  const badges = {
    verified: {
      icon: CheckCircle2,
      label: "Verified Listing",
      className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    },
    photos: {
      icon: Camera,
      label: "Verified Photos",
      className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
    },
    owner: {
      icon: UserCheck,
      label: "Verified Owner",
      className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
    },
    responsive: {
      icon: Zap,
      label: "Fast Response",
      className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
    }
  };

  const badge = badges[variant];
  const Icon = badge.icon;

  return (
    <Badge className={`${badge.className} flex items-center gap-1`}>
      <Icon className="h-3 w-3" />
      {badge.label}
    </Badge>
  );
}
