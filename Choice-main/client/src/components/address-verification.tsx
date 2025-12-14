import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MapPin, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface AddressVerificationProps {
  propertyId: string;
  address: string;
  city: string;
  state: string;
  zipCode?: string;
  onVerified?: (coordinates: { latitude: number; longitude: number }) => void;
  isVerified?: boolean;
}

export function AddressVerification({
  propertyId,
  address,
  city,
  state,
  zipCode,
  onVerified,
  isVerified = false,
}: AddressVerificationProps) {
  const { toast } = useToast();
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "verifying" | "verified" | "failed">(
    isVerified ? "verified" : "idle"
  );

  const verifyMutation = useMutation({
    mutationFn: async () => {
      const fullAddress = `${address}, ${city}, ${state}${zipCode ? ` ${zipCode}` : ""}`;
      
      try {
        const response = await apiRequest("PATCH", `/api/properties/${propertyId}/address-verify`, {
          address,
          city,
          state,
          zipCode,
          fullAddress,
        });
        
        return response.data;
      } catch (error: any) {
        throw new Error(error.message || "Failed to verify address");
      }
    },
    onSuccess: (response: any) => {
      const data = response?.data || response;
      setVerificationStatus("verified");
      toast({
        title: "Address verified successfully",
        description: "Your property address has been verified and geocoded.",
      });
      if (data?.latitude && data?.longitude) {
        onVerified?.({ latitude: parseFloat(data.latitude), longitude: parseFloat(data.longitude) });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/properties", propertyId] });
    },
    onError: (error: any) => {
      setVerificationStatus("failed");
      toast({
        title: "Address verification failed",
        description: error.message || "Could not verify the address. Please check and try again.",
        variant: "destructive",
      });
    },
  });

  const fullAddress = `${address}, ${city}, ${state}${zipCode ? ` ${zipCode}` : ""}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Address Verification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {fullAddress}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {verificationStatus === "verified" && (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Address verified</span>
            </div>
          )}
          {verificationStatus === "failed" && (
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm font-medium">Verification failed</span>
            </div>
          )}
        </div>

        {verificationStatus !== "verified" && (
          <Button
            onClick={() => {
              setVerificationStatus("verifying");
              verifyMutation.mutate();
            }}
            disabled={verifyMutation.isPending || verificationStatus === "verifying"}
            className="w-full"
            data-testid="button-verify-address"
          >
            {verifyMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4 mr-2" />
                Verify Address
              </>
            )}
          </Button>
        )}

        <p className="text-xs text-gray-600 dark:text-gray-400">
          Address verification confirms your property location and enables geocoding for accurate mapping.
        </p>
      </CardContent>
    </Card>
  );
}
