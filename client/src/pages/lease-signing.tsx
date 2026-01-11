import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileCheck, ShieldCheck, Signature, Download, Clock } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

const signatureSchema = z.object({
  signerName: z.string().min(2, "Full legal name is required"),
  consentElectronic: z.boolean().refine(val => val === true, "You must agree to sign electronically"),
  consentBinding: z.boolean().refine(val => val === true, "You must acknowledge this is legally binding"),
  stateDisclosureAcknowledged: z.boolean().refine(val => val === true, "You must acknowledge the state-specific disclosure"),
});

type SignatureFormValues = z.infer<typeof signatureSchema>;

const STATE_DISCLOSURES: Record<string, string> = {
  "CA": "California E-Signature Disclosure: You agree that your electronic signature is the legal equivalent of your manual signature on this Agreement. Under the California Uniform Electronic Transactions Act (UETA), this Agreement is legally binding.",
  "NY": "New York E-Signature Disclosure: This document is being signed electronically pursuant to the New York Electronic Signatures and Records Act (ESRA). Your electronic signature has the same validity and enforceability as a handwritten signature.",
  "TX": "Texas E-Signature Disclosure: You acknowledge that your electronic signature on this Agreement is legally binding under the Texas Uniform Electronic Transactions Act.",
};

export default function LeaseSigning() {
  const [, params] = useRoute("/lease-signing/:applicationId");
  const applicationId = params?.applicationId;
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: user } = useQuery<any>({
    queryKey: ["/api/v2/auth/me"],
  });

  const { data: application, isLoading: isLoadingApp } = useQuery<any>({
    queryKey: [`/api/v2/applications/${applicationId}`],
    enabled: !!applicationId,
  });

  const signLeaseMutation = useMutation({
    mutationFn: async (values: SignatureFormValues) => {
      const res = await apiRequest("POST", `/api/v2/leases/${applicationId}/sign`, {
        ...values,
        stateCode: application?.stateSnapshot || application?.properties?.state || "US",
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Lease Signed",
        description: "Your signature has been successfully recorded.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/v2/applications/${applicationId}`] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Signing Failed",
        description: error.message || "Failed to submit signature. Please try again.",
      });
    },
  });

  const form = useForm<SignatureFormValues>({
    resolver: zodResolver(signatureSchema),
    defaultValues: {
      signerName: "",
      consentElectronic: false,
      consentBinding: false,
      stateDisclosureAcknowledged: false,
    },
  });

  if (isLoadingApp) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="container mx-auto py-10 text-center">
        <h1 className="text-2xl font-bold">Application Not Found</h1>
        <Button onClick={() => setLocation("/")} className="mt-4">Return Home</Button>
      </div>
    );
  }

  const isSigned = application.lease_signature_status === "signed";
  const isPartiallySigned = application.lease_signature_status === "partially_signed";
  const userRole = user?.role;
  const isTenant = userRole === "renter";
  const isLandlord = userRole === "owner" || userRole === "landlord";

  const propertyState = application?.stateSnapshot || application?.properties?.state || "US";
  const stateDisclosure = STATE_DISCLOSURES[propertyState] || "Standard E-Signature Disclosure: By signing this document, you agree that your electronic signature is legally binding and has the same effect as a handwritten signature.";

  // Logic for button visibility
  const canTenantSign = isTenant && !isPartiallySigned && !isSigned;
  const canLandlordSign = isLandlord && isPartiallySigned && !isSigned;
  const isAwaitingLandlord = isTenant && isPartiallySigned;

  return (
    <div className="container max-w-2xl mx-auto py-10 px-4">
      <Card className="border-t-4 border-t-primary shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl flex items-center gap-2">
              <FileCheck className="h-6 w-6 text-primary" />
              Lease Agreement Signature
            </CardTitle>
            <Badge variant={isSigned ? "default" : isPartiallySigned ? "secondary" : "outline"} className="capitalize">
              {application.lease_signature_status?.replace("_", " ") || "Pending"}
            </Badge>
          </div>
          <CardDescription>
            {isSigned 
              ? "This lease agreement is fully executed and legally binding." 
              : "Please review the terms and provide your electronic signature below."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-muted/50 p-4 rounded-lg border border-border">
            <h3 className="font-semibold mb-2">Application Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">Property</p>
                <p>{application.propertyTitleSnapshot || application.properties?.title || "N/A"}</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Address</p>
                <p>{application.propertyAddressSnapshot || application.properties?.address || "N/A"}</p>
              </div>
            </div>
          </div>

          {isSigned && (application.signed_lease_pdf_url || application.id) && (
            <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Signed Agreement Available</p>
                  <p className="text-xs text-muted-foreground">Download your copy for your records</p>
                </div>
              </div>
              <Button asChild size="sm" variant="outline">
                <a href={`/api/v2/leases/${applicationId}/download-signed-pdf`} target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </a>
              </Button>
            </div>
          )}

          {isAwaitingLandlord && (
            <div className="bg-yellow-500/10 p-4 rounded-lg border border-yellow-500/20 flex items-center gap-3">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-700">Awaiting Landlord Signature</p>
                <p className="text-xs text-yellow-600">Your signature is recorded. The landlord needs to sign next.</p>
              </div>
            </div>
          )}

          {(canTenantSign || canLandlordSign) && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit((v) => signLeaseMutation.mutate(v))} className="space-y-6">
                <FormField
                  control={form.control}
                  name="signerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Legal Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Signature className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="Type your full name as it appears on ID" 
                            className="pl-9 font-serif italic text-lg" 
                            {...field} 
                            disabled={signLeaseMutation.isPending}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4 rounded-md border p-4 bg-muted/30">
                  <div className="mb-4 pb-4 border-b">
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      State-Specific Legal Disclosure ({propertyState})
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed italic">
                      {stateDisclosure}
                    </p>
                  </div>

                  <FormField
                    control={form.control}
                    name="stateDisclosureAcknowledged"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={signLeaseMutation.isPending}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-primary font-semibold">I acknowledge the state disclosure above</FormLabel>
                          <p className="text-xs text-muted-foreground">
                            Required by {propertyState} law for electronic transactions.
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="consentElectronic"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={signLeaseMutation.isPending}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>I agree to sign electronically</FormLabel>
                          <p className="text-xs text-muted-foreground">
                            This signature is a digital representation of your identity.
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="consentBinding"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={signLeaseMutation.isPending}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>I understand this is legally binding</FormLabel>
                          <p className="text-xs text-muted-foreground">
                            By signing, you agree to all terms of the lease agreement.
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={!form.formState.isValid || signLeaseMutation.isPending}
                >
                  {signLeaseMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing Signature...
                    </>
                  ) : (
                    "Complete Signature"
                  )}
                </Button>
              </form>
            </Form>
          )}

          {isSigned && !application.signed_lease_pdf_url && (
            <div className="text-center py-8">
              <ShieldCheck className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Lease Fully Signed</h3>
              <p className="text-sm text-muted-foreground">Your signed lease is being processed. It will be available for download shortly.</p>
            </div>
          )}

          {isLandlord && !isPartiallySigned && !isSigned && (
            <div className="bg-muted p-4 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">
                You can sign the lease once the tenant has provided their signature.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="text-center text-xs text-muted-foreground border-t bg-muted/10 pt-4">
          IP Address and timestamp will be recorded for legal audit purposes.
        </CardFooter>
      </Card>
    </div>
  );
}
