import { format } from "date-fns";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import * as z from "zod";
import { getRequiredDisclosures } from "@shared/state-disclosures";
import { 
  FileText, 
  MapPin, 
  Clock, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle, 
  CheckCircle2,
  Loader2,
  Shield,
  AlertCircle,
  DollarSign,
  CloudUpload,
  Check
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import PrivacyNotice from "@/components/shared/PrivacyNotice";
import SecurityBadges from "@/components/shared/SecurityBadges";
import { SubmissionReceipt } from "@/components/application/SubmissionReceipt";
import { AutosaveIndicator } from "@/components/application/AutosaveIndicator";
import type { Property } from "@shared/schema";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

const applyFormSchema = z.object({
  propertyId: z.string(),
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Valid phone number is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  currentAddress: z.string().min(10, "Full current address is required"),
  ssn: z.string().optional(),
  employerName: z.string().min(2, "Employer name is required"),
  jobTitle: z.string().min(2, "Job title is required"),
  monthlyIncome: z.string().min(1, "Monthly income is required"),
  employmentDuration: z.string().min(1, "Employment duration is required"),
  emergencyContactName: z.string().min(2, "Emergency contact name is required"),
  emergencyContactPhone: z.string().min(10, "Emergency contact phone is required"),
  emergencyContactRelationship: z.string().min(2, "Relationship is required"),
  // Rental History
  currentLandlordName: z.string().optional(),
  currentLandlordPhone: z.string().optional(),
  currentRentAmount: z.string().optional(),
  reasonForMoving: z.string().optional(),
  // References
  ref1Name: z.string().optional(),
  ref1Phone: z.string().optional(),
  ref1Relation: z.string().optional(),
  // Pets & Vehicles
  hasPets: z.boolean().default(false),
  petDetails: z.string().optional(),
  hasVehicles: z.boolean().default(false),
  vehicleDetails: z.string().optional(),
  // Disclosures
  hasEvictions: z.boolean().default(false),
  hasFelonies: z.boolean().default(false),
  hasBankruptcies: z.boolean().default(false),
  disclosureExplanation: z.string().optional(),
  // Original acknowledgments
  acknowledgePetPolicy: z.boolean().refine(val => val === true, "You must acknowledge the pet policy"),
  acknowledgeSmokingPolicy: z.boolean().refine(val => val === true, "You must acknowledge the smoking policy"),
  acknowledgeOccupancyLimit: z.boolean().refine(val => val === true, "You must acknowledge the occupancy limit"),
  acknowledgeUtilities: z.boolean().refine(val => val === true, "You must acknowledge the utilities policy"),
  agreeToBackgroundCheck: z.boolean().refine(val => val === true, "You must agree to the background check"),
  agreeToTerms: z.boolean().refine(val => val === true, "You must agree to the terms"),
  signature: z.string().min(2, "Electronic signature is required"),
  legalDisclosures: z.object({
    fairHousingAcknowledged: z.boolean().refine(val => val === true, "Required"),
    creditCheckAuthorized: z.boolean().refine(val => val === true, "Required"),
    accuracyCertified: z.boolean().refine(val => val === true, "Required"),
    feeAcknowledged: z.boolean().refine(val => val === true, "Required"),
  }),
  stateDisclosures: z.record(z.object({
    acknowledged: z.boolean().refine(val => val === true, "Required"),
  })).optional(),
});

type ApplyFormValues = z.infer<typeof applyFormSchema>;

export default function Apply() {
  const [, params] = useRoute("/apply/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [applicationId, setApplicationId] = useState<string | null>(null);

  const steps = [
    { id: 1, label: "Personal Info" },
    { id: 2, label: "Employment" },
    { id: 3, label: "Emergency Contact" },
    { id: 4, label: "Rental History" },
    { id: 5, label: "References" },
    { id: 6, label: "Pets & Vehicles" },
    { id: 7, label: "Legal Disclosures" },
    { id: 8, label: "Property Policies" },
    { id: 9, label: "Review & Submit" }
  ];

  const { data: draftResponse, isLoading: isLoadingDraft } = useQuery<ApiResponse<any>>({
    queryKey: [`/api/v2/applications/draft?propertyId=${params?.id}`],
    enabled: !!params?.id && !applicationId
  });

  const draft = draftResponse?.data;

  const { data: propertyResponse, isLoading: isLoadingProperty } = useQuery<ApiResponse<Property>>({
    queryKey: [`/api/v2/properties/${params?.id}`],
    enabled: !!params?.id
  });

  const property = propertyResponse?.data;

  const form = useForm<ApplyFormValues>({
    resolver: zodResolver(applyFormSchema),
    defaultValues: {
      propertyId: params?.id || "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      dateOfBirth: "",
      currentAddress: "",
      ssn: "",
      employerName: "",
      jobTitle: "",
      monthlyIncome: "",
      employmentDuration: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      emergencyContactRelationship: "",
      currentLandlordName: "",
      currentLandlordPhone: "",
      currentRentAmount: "",
      reasonForMoving: "",
      ref1Name: "",
      ref1Phone: "",
      ref1Relation: "",
      hasPets: false,
      petDetails: "",
      hasVehicles: false,
      vehicleDetails: "",
      hasEvictions: false,
      hasFelonies: false,
      hasBankruptcies: false,
      disclosureExplanation: "",
      acknowledgePetPolicy: false,
      acknowledgeSmokingPolicy: false,
      acknowledgeOccupancyLimit: false,
      acknowledgeUtilities: false,
      agreeToBackgroundCheck: false,
      agreeToTerms: false,
      signature: "",
    },
  });

  const { reset, getValues } = form;

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const stepParam = searchParams.get("step");
    if (stepParam) {
      const step = parseInt(stepParam);
      if (!isNaN(step) && step >= 1 && step <= steps.length) {
        setCurrentStep(step);
      }
    }
  }, []);

  useEffect(() => {
    const appToLoad = draft;
    if (appToLoad) {
      setApplicationId(appToLoad.id);
      
      const searchParams = new URLSearchParams(window.location.search);
      if (!searchParams.has("step")) {
        setCurrentStep(appToLoad.lastSavedStep || 1);
      }
      
      reset({
        propertyId: params?.id || "",
        firstName: appToLoad.personalInfo?.firstName || "",
        lastName: appToLoad.personalInfo?.lastName || "",
        email: appToLoad.personalInfo?.email || "",
        phone: appToLoad.personalInfo?.phone || "",
        dateOfBirth: appToLoad.personalInfo?.dateOfBirth || "",
        currentAddress: appToLoad.personalInfo?.currentAddress || "",
        ssn: appToLoad.personalInfo?.ssn || "",
        employerName: appToLoad.employment?.employerName || "",
        jobTitle: appToLoad.employment?.jobTitle || "",
        monthlyIncome: appToLoad.employment?.monthlyIncome || "",
        employmentDuration: appToLoad.employment?.employmentDuration || "",
        emergencyContactName: appToLoad.rentalHistory?.emergencyContact?.name || "",
        emergencyContactPhone: appToLoad.rentalHistory?.emergencyContact?.phone || "",
        emergencyContactRelationship: appToLoad.rentalHistory?.emergencyContact?.relationship || "",
        currentLandlordName: appToLoad.rentalHistory?.currentLandlordName || "",
        currentLandlordPhone: appToLoad.rentalHistory?.currentLandlordPhone || "",
        currentRentAmount: appToLoad.rentalHistory?.currentRentAmount || "",
        reasonForMoving: appToLoad.rentalHistory?.reasonForMoving || "",
        ref1Name: appToLoad.references?.name || "",
        ref1Phone: appToLoad.references?.phone || "",
        ref1Relation: appToLoad.references?.relationship || "",
        hasPets: appToLoad.rentalHistory?.pets?.hasPets || false,
        petDetails: appToLoad.rentalHistory?.pets?.details || "",
        hasVehicles: appToLoad.rentalHistory?.vehicles?.hasVehicles || false,
        vehicleDetails: appToLoad.rentalHistory?.vehicles?.details || "",
        hasEvictions: appToLoad.disclosures?.hasEvictions || false,
        hasFelonies: appToLoad.disclosures?.hasFelonies || false,
        hasBankruptcies: appToLoad.disclosures?.hasBankruptcies || false,
        disclosureExplanation: appToLoad.disclosures?.explanation || "",
        acknowledgePetPolicy: !!appToLoad.legalDisclosures?.petPolicy,
        acknowledgeSmokingPolicy: !!appToLoad.legalDisclosures?.smokingPolicy,
        acknowledgeOccupancyLimit: !!appToLoad.legalDisclosures?.occupancyLimit,
        acknowledgeUtilities: !!appToLoad.legalDisclosures?.utilities,
        agreeToBackgroundCheck: !!appToLoad.legalDisclosures?.fcraConsent,
        agreeToTerms: !!appToLoad.legalDisclosures?.accuracyCertified,
        signature: appToLoad.signature || "",
        legalDisclosures: appToLoad.legalDisclosures || {
          fairHousingAcknowledged: false,
          creditCheckAuthorized: false,
          accuracyCertified: false,
          feeAcknowledged: false,
        },
      });

      if (appToLoad.status !== 'draft') {
        setIsSubmitted(true);
      }
    }
  }, [draft, reset, params?.id]);

  const autosave = useCallback(async (values: ApplyFormValues, step: number) => {
    if (!params?.id) return;
    
    setSaveStatus('saving');
    try {
      const payload = {
        propertyId: params.id,
        step: step,
        personalInfo: {
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          phone: values.phone,
          dateOfBirth: values.dateOfBirth,
          currentAddress: values.currentAddress,
          ssn: values.ssn
        },
        employment: {
          employerName: values.employerName,
          jobTitle: values.jobTitle,
          monthlyIncome: values.monthlyIncome,
          employmentDuration: values.employmentDuration
        },
        rentalHistory: {
          currentLandlordName: values.currentLandlordName,
          currentLandlordPhone: values.currentLandlordPhone,
          currentRentAmount: values.currentRentAmount,
          reasonForMoving: values.reasonForMoving,
          emergencyContact: {
            name: values.emergencyContactName,
            phone: values.emergencyContactPhone,
            relationship: values.emergencyContactRelationship
          },
          pets: {
            hasPets: values.hasPets,
            details: values.petDetails
          },
          vehicles: {
            hasVehicles: values.hasVehicles,
            details: values.vehicleDetails
          }
        },
        references: {
          name: values.ref1Name,
          phone: values.ref1Phone,
          relationship: values.ref1Relation
        },
        disclosures: {
          hasEvictions: values.hasEvictions,
          hasFelonies: values.hasFelonies,
          hasBankruptcies: values.hasBankruptcies,
          explanation: values.disclosureExplanation
        },
        legalDisclosures: {
          ...values.legalDisclosures,
          acknowledgedAt: new Date().toISOString()
        }
      };

      let response;
      if (applicationId) {
        response = await apiRequest("PATCH", `/api/v2/applications/${applicationId}/autosave`, payload);
      } else {
        response = await apiRequest("POST", "/api/v2/applications", { ...payload, status: 'draft' });
      }
      
      if (!response.ok) throw new Error("Auto-sync failed");
      
      const data = await response.json();
      if (!applicationId && data.success) {
        setApplicationId(data.data.id);
      }
      
      setSaveStatus('saved');
      toast({
        title: "Autosaved",
        description: "Your progress has been saved.",
      });
    } catch (error) {
      console.error("Autosave failed:", error);
      setSaveStatus('error');
    }
  }, [params?.id, applicationId, toast]);

  // Handle autosave on field blur
  const handleBlur = () => {
    autosave(getValues(), currentStep);
  };

  const onSubmit = async (values: ApplyFormValues) => {
    if (!applicationId) {
      toast({
        title: "Sync Error",
        description: "Application ID not found. Please try refreshing or wait for autosave.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      console.log("[Apply] Submitting application:", applicationId);
      // 1. Ensure latest data is saved as draft first
      await autosave(values, currentStep);
      
      // 2. Explicitly submit
      const submitResponse = await apiRequest("PATCH", `/api/v2/applications/${applicationId}/status`, { 
        status: "submitted" 
      });

      const result = await submitResponse.json();

      if (!submitResponse.ok) {
        throw new Error(result.error || "Final submission failed. Your draft is saved.");
      }

      setIsSubmitted(true);
      toast({
        title: "Application Submitted",
        description: "Your rental application has been received successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Submission Issue",
        description: error.message || "There was an error submitting your application.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoadingProperty || isLoadingDraft) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50/30 dark:bg-gray-950 flex flex-col">
        <Navbar />
        <div className="flex-1 container max-w-4xl mx-auto py-20 px-4">
          <SubmissionReceipt 
            property={property}
            applicantName={`${getValues("firstName")} ${getValues("lastName")}`}
            submissionDate={new Date().toLocaleDateString("en-US", { month: 'long', day: 'numeric', year: 'numeric' })}
            referenceId={applicationId?.substring(0, 8).toUpperCase() || "PENDING"}
          />
        </div>
        <Footer />
      </div>
    );
  }

  const progressPercentage = ((currentStep - 1) / (steps.length - 1)) * 100;

  const StepIndicator = () => (
    <div className="flex items-center gap-2">
      {steps.map((step) => (
        <div
          key={step.id}
          className={`h-2 w-8 rounded-none transition-all duration-300 ${
            currentStep >= step.id ? "bg-primary" : "bg-muted"
          }`}
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <div className="bg-gradient-to-r from-primary to-secondary text-white py-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full transform translate-x-10 -translate-y-10"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex-1">
              <h1 className="font-heading text-3xl font-bold mb-2 flex items-center gap-3">
                <FileText className="h-8 w-8 text-accent" />
                Rental Application
              </h1>
              {property && (
                <div className="flex items-center gap-4 mt-4 p-4 bg-white/10 backdrop-blur-md rounded-none border border-white/20">
                  <div className="h-20 w-32 flex-shrink-0 bg-gray-800">
                    {Array.isArray(property.images) && property.images[0] && (
                      <img src={property.images[0] as string} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black uppercase tracking-widest text-accent">{property.propertyType || 'Residential'}</p>
                    <h2 className="text-xl font-bold leading-tight">{property.title}</h2>
                    <p className="text-white/80 text-sm flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {property.address}
                    </p>
                  </div>
                  <div className="text-right border-l border-white/20 pl-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-accent mb-1">Monthly Rent</p>
                    <p className="text-2xl font-black">${parseFloat(String(property.price || 0)).toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-950 border-b sticky top-16 z-40 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-8">
            <div className="flex-1">
              <div className="relative mb-2">
                <div className="h-2 bg-muted rounded-none overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 ease-out"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <p className="text-xs font-black uppercase tracking-widest text-primary">
                    Step {currentStep}: {steps.find(s => s.id === currentStep)?.label}
                  </p>
                  <Separator orientation="vertical" className="h-3" />
                  <AutosaveIndicator status={saveStatus} />
                </div>
                <p className="text-xs font-bold text-gray-400">
                  {Math.round(progressPercentage)}% Complete
                </p>
              </div>
            </div>
            <StepIndicator />
          </div>
        </div>
      </div>

      <div className="flex-1 bg-gray-50/50 dark:bg-gray-900/50">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            {currentStep === 1 && property && (
              <div className="mb-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-white dark:bg-gray-950 border-gray-100 dark:border-gray-800 rounded-none shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        Lease Terms
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 font-medium">Monthly Rent</span>
                        <span className="font-bold text-primary">${parseFloat(String(property.price || 0)).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 font-medium">Security Deposit</span>
                        <span className="font-bold text-primary">${parseFloat(String(property.price || 0)).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 font-medium">Lease Term</span>
                        <span className="font-bold capitalize">{property.leaseTerm || '12 Months'}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white dark:bg-gray-950 border-gray-100 dark:border-gray-800 rounded-none shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-primary" />
                        Property Rules
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 font-medium">Pet Policy</span>
                        <span className="font-bold">{property.petsAllowed ? "Pets Allowed" : "No Pets"}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 font-medium">Smoking</span>
                        <span className="font-bold">No Smoking</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 font-medium">Occupancy Limit</span>
                        <span className="font-bold">2 Persons</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {currentStep === 1 && (
                  <Card className="bg-white dark:bg-gray-950 border-gray-100 dark:border-gray-800 rounded-none shadow-xl overflow-visible">
                    <CardHeader className="border-b border-gray-50 dark:border-gray-900 pb-6">
                      <CardTitle className="text-2xl font-black tracking-tight">Personal Details</CardTitle>
                      <CardDescription className="text-gray-500 font-medium">Tell us about yourself. This information is used for identity verification.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-black uppercase tracking-widest text-gray-400">First Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter your first name" className="h-12 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 focus:ring-primary rounded-none" {...field} onBlur={handleBlur} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-black uppercase tracking-widest text-gray-400">Last Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter your last name" className="h-12 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 focus:ring-primary rounded-none" {...field} onBlur={handleBlur} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-black uppercase tracking-widest text-gray-400">Email Address</FormLabel>
                              <FormControl>
                                <Input placeholder="your.email@example.com" type="email" className="h-12 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 focus:ring-primary rounded-none" {...field} onBlur={handleBlur} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-black uppercase tracking-widest text-gray-400">Phone Number</FormLabel>
                              <FormControl>
                                <Input placeholder="(555) 000-0000" className="h-12 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 focus:ring-primary rounded-none" {...field} onBlur={handleBlur} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="dateOfBirth"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-black uppercase tracking-widest text-gray-400">Date of Birth</FormLabel>
                              <FormControl>
                                <Input type="date" className="h-12 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 focus:ring-primary rounded-none" {...field} onBlur={handleBlur} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="ssn"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                SSN (Optional)
                                <Shield className="h-3 w-3 text-green-500" />
                              </FormLabel>
                              <FormControl>
                                <Input placeholder="XXX-XX-XXXX" className="h-12 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 focus:ring-primary rounded-none" {...field} onBlur={handleBlur} />
                              </FormControl>
                              <FormDescription className="text-[10px]">Encrypted & Secure</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="currentAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-black uppercase tracking-widest text-gray-400">Current Residential Address</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your current street address, city, state, zip" className="h-12 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 focus:ring-primary rounded-none" {...field} onBlur={handleBlur} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Step 2: Employment */}
                {currentStep === 2 && (
                  <Card className="bg-white dark:bg-gray-950 border-gray-100 dark:border-gray-800 rounded-none shadow-xl overflow-visible">
                    <CardHeader className="border-b border-gray-50 dark:border-gray-900 pb-6">
                      <CardTitle className="text-2xl font-black tracking-tight">Employment Information</CardTitle>
                      <CardDescription className="text-gray-500 font-medium">Verify your income and employment stability.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="employerName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-black uppercase tracking-widest text-gray-400">Current Employer</FormLabel>
                              <FormControl>
                                <Input placeholder="Company Name" className="h-12 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 focus:ring-primary rounded-none" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="jobTitle"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-black uppercase tracking-widest text-gray-400">Job Title</FormLabel>
                              <FormControl>
                                <Input placeholder="Your Position" className="h-12 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 focus:ring-primary rounded-none" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="monthlyIncome"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-black uppercase tracking-widest text-gray-400">Gross Monthly Income</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. 5000" className="h-12 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 focus:ring-primary rounded-none" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="employmentDuration"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-black uppercase tracking-widest text-gray-400">Time at Company</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. 2 years" className="h-12 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 focus:ring-primary rounded-none" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Step 3: Emergency Contact */}
                {currentStep === 3 && (
                  <Card className="bg-white dark:bg-gray-950 border-gray-100 dark:border-gray-800 rounded-none shadow-xl overflow-visible">
                    <CardHeader className="border-b border-gray-50 dark:border-gray-900 pb-6">
                      <CardTitle className="text-2xl font-black tracking-tight">Emergency Contact</CardTitle>
                      <CardDescription className="text-gray-500 font-medium">Who should we contact in case of an emergency?</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8 space-y-6">
                      <FormField
                        control={form.control}
                        name="emergencyContactName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-black uppercase tracking-widest text-gray-400">Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Contact's full name" className="h-12 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 focus:ring-primary rounded-none" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="emergencyContactPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-black uppercase tracking-widest text-gray-400">Phone Number</FormLabel>
                              <FormControl>
                                <Input placeholder="(555) 000-0000" className="h-12 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 focus:ring-primary rounded-none" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="emergencyContactRelationship"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-black uppercase tracking-widest text-gray-400">Relationship</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Spouse, Parent, Friend" className="h-12 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 focus:ring-primary rounded-none" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Step 4: Rental History */}
                {currentStep === 4 && (
                  <Card className="bg-white dark:bg-gray-950 border-gray-100 dark:border-gray-800 rounded-none shadow-xl overflow-visible">
                    <CardHeader className="border-b border-gray-50 dark:border-gray-900 pb-6">
                      <CardTitle className="text-2xl font-black tracking-tight">Rental History</CardTitle>
                      <CardDescription className="text-gray-500 font-medium">Tell us about your current or most recent living situation.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="currentLandlordName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-black uppercase tracking-widest text-gray-400">Current Landlord/Manager</FormLabel>
                              <FormControl>
                                <Input placeholder="Name of landlord or company" className="h-12 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 focus:ring-primary rounded-none" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="currentLandlordPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-black uppercase tracking-widest text-gray-400">Landlord Phone</FormLabel>
                              <FormControl>
                                <Input placeholder="(555) 000-0000" className="h-12 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 focus:ring-primary rounded-none" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="currentRentAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-black uppercase tracking-widest text-gray-400">Current Rent Paid</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. 1500" className="h-12 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 focus:ring-primary rounded-none" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="reasonForMoving"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-black uppercase tracking-widest text-gray-400">Reason for Moving</FormLabel>
                              <FormControl>
                                <Input placeholder="Short explanation" className="h-12 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 focus:ring-primary rounded-none" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Step 5: References */}
                {currentStep === 5 && (
                  <Card className="bg-white dark:bg-gray-950 border-gray-100 dark:border-gray-800 rounded-none shadow-xl overflow-visible">
                    <CardHeader className="border-b border-gray-50 dark:border-gray-900 pb-6">
                      <CardTitle className="text-2xl font-black tracking-tight">Personal References</CardTitle>
                      <CardDescription className="text-gray-500 font-medium">Please provide a professional or personal reference who is not a relative.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8 space-y-6">
                      <FormField
                        control={form.control}
                        name="ref1Name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-black uppercase tracking-widest text-gray-400">Reference Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Full name of reference" className="h-12 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 focus:ring-primary rounded-none" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="ref1Phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-black uppercase tracking-widest text-gray-400">Reference Phone</FormLabel>
                              <FormControl>
                                <Input placeholder="(555) 000-0000" className="h-12 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 focus:ring-primary rounded-none" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="ref1Relation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-black uppercase tracking-widest text-gray-400">Relationship</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Former Manager, Colleague" className="h-12 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 focus:ring-primary rounded-none" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Step 6: Pets & Vehicles */}
                {currentStep === 6 && (
                  <Card className="bg-white dark:bg-gray-950 border-gray-100 dark:border-gray-800 rounded-none shadow-xl overflow-visible">
                    <CardHeader className="border-b border-gray-50 dark:border-gray-900 pb-6">
                      <CardTitle className="text-2xl font-black tracking-tight">Pets & Vehicles</CardTitle>
                      <CardDescription className="text-gray-500 font-medium">Help us understand your space and parking needs.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8 space-y-6">
                      <div className="space-y-6">
                        <div className="flex items-center space-x-2">
                          <FormField
                            control={form.control}
                            name="hasPets"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 bg-gray-50/50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-none w-full">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="font-bold">I have pets</FormLabel>
                                  <FormDescription>Check this if you plan to keep pets at the property.</FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>
                        {form.watch("hasPets") && (
                          <FormField
                            control={form.control}
                            name="petDetails"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-black uppercase tracking-widest text-gray-400">Pet Details</FormLabel>
                                <FormControl>
                                  <Input placeholder="Breed, weight, and age of each pet" className="h-12 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 focus:ring-primary rounded-none" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        <Separator className="my-6" />

                        <div className="flex items-center space-x-2">
                          <FormField
                            control={form.control}
                            name="hasVehicles"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 bg-gray-50/50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-none w-full">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="font-bold">I have vehicles</FormLabel>
                                  <FormDescription>Check this if you require parking space for any vehicles.</FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>
                        {form.watch("hasVehicles") && (
                          <FormField
                            control={form.control}
                            name="vehicleDetails"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-black uppercase tracking-widest text-gray-400">Vehicle Details</FormLabel>
                                <FormControl>
                                  <Input placeholder="Make, model, and year for each vehicle" className="h-12 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 focus:ring-primary rounded-none" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Step 7: Legal Disclosures */}
                {currentStep === 7 && (
                  <Card className="bg-white dark:bg-gray-950 border-gray-100 dark:border-gray-800 rounded-none shadow-xl overflow-visible">
                    <CardHeader className="border-b border-gray-50 dark:border-gray-900 pb-6">
                      <CardTitle className="text-2xl font-black tracking-tight">Legal Disclosures</CardTitle>
                      <CardDescription className="text-gray-500 font-medium">Please answer the following questions truthfully.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8 space-y-6">
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="hasEvictions"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border border-gray-100 dark:border-gray-800 rounded-none">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="font-bold">Have you ever been evicted?</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="hasFelonies"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border border-gray-100 dark:border-gray-800 rounded-none">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="font-bold">Have you ever been convicted of a felony?</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="hasBankruptcies"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border border-gray-100 dark:border-gray-800 rounded-none">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="font-bold">Have you ever filed for bankruptcy?</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="disclosureExplanation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-black uppercase tracking-widest text-gray-400">Explanation (If Yes to any)</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Provide details for any checked boxes above..." 
                                  className="min-h-[100px] bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 focus:ring-primary rounded-none resize-none" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Step 8: Property Policies */}
                {currentStep === 8 && (
                  <Card className="bg-white dark:bg-gray-950 border-gray-100 dark:border-gray-800 rounded-none shadow-xl overflow-visible">
                    <CardHeader className="border-b border-gray-50 dark:border-gray-900 pb-6">
                      <CardTitle className="text-2xl font-black tracking-tight">Policies & Acknowledgments</CardTitle>
                      <CardDescription className="text-gray-500 font-medium">Review and agree to the property-specific rules.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8 space-y-6">
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="acknowledgePetPolicy"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border border-gray-100 dark:border-gray-800 rounded-none">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="font-bold">I acknowledge the Pet Policy</FormLabel>
                                <FormDescription className="text-[10px]">{property?.petsAllowed ? "Pets are permitted with additional deposit." : "No pets are allowed at this property."}</FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="acknowledgeSmokingPolicy"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border border-gray-100 dark:border-gray-800 rounded-none">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="font-bold">I acknowledge the Smoking Policy</FormLabel>
                                <FormDescription className="text-[10px]">No smoking is allowed inside the unit.</FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="acknowledgeOccupancyLimit"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border border-gray-100 dark:border-gray-800 rounded-none">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="font-bold">I acknowledge the Occupancy Limit</FormLabel>
                                <FormDescription className="text-[10px]">Max 2 persons per bedroom.</FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="acknowledgeUtilities"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 border border-gray-100 dark:border-gray-800 rounded-none">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="font-bold">I acknowledge the Utilities Policy</FormLabel>
                                <FormDescription className="text-[10px]">Tenant is responsible for electric and water.</FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Step 9: Review & Submit */}
                {currentStep === 9 && (
                  <Card className="bg-white dark:bg-gray-950 border-gray-100 dark:border-gray-800 rounded-none shadow-xl overflow-visible">
                    <CardHeader className="border-b border-gray-50 dark:border-gray-900 pb-6">
                      <CardTitle className="text-2xl font-black tracking-tight">Final Review & Submission</CardTitle>
                      <CardDescription className="text-gray-500 font-medium">Please verify all information before submitting your application.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8 space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <h3 className="text-sm font-black uppercase tracking-widest text-primary border-b pb-2">Applicant Profile</h3>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <span className="text-gray-500">Full Name:</span>
                            <span className="font-bold text-right">{getValues("firstName")} {getValues("lastName")}</span>
                            <span className="text-gray-500">Email:</span>
                            <span className="font-bold text-right truncate">{getValues("email")}</span>
                            <span className="text-gray-500">Phone:</span>
                            <span className="font-bold text-right">{getValues("phone")}</span>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h3 className="text-sm font-black uppercase tracking-widest text-primary border-b pb-2">Employment</h3>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <span className="text-gray-500">Employer:</span>
                            <span className="font-bold text-right">{getValues("employerName")}</span>
                            <span className="text-gray-500">Income:</span>
                            <span className="font-bold text-right">${getValues("monthlyIncome")}/mo</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-none space-y-6">
                        <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-4">Legal Consent & Attestation</h3>
                        
                        <FormField
                          control={form.control}
                          name="agreeToBackgroundCheck"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="font-bold">Background & Credit Authorization</FormLabel>
                                <FormDescription className="text-[10px]">
                                  I authorize Choice Properties to obtain my consumer credit report, criminal background check, and eviction history for the purpose of evaluating this rental application.
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="agreeToTerms"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="font-bold">Attestation of Truthfulness</FormLabel>
                                <FormDescription className="text-[10px]">
                                  I certify that all information provided in this application is true, complete, and correct. I understand that any false statements or omissions may result in denial of application or termination of lease.
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />

                        <Separator />

                        <FormField
                          control={form.control}
                          name="signature"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-black uppercase tracking-widest text-gray-400">Electronic Signature (Full Legal Name)</FormLabel>
                              <FormControl>
                                <Input placeholder="Type your full legal name to sign" className="h-12 bg-white dark:bg-gray-950 border-gray-100 dark:border-gray-800 font-signature text-xl italic rounded-none" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-none space-y-6 border border-gray-200 dark:border-gray-700">
                        <h3 className="text-sm font-black uppercase tracking-widest text-primary mb-4">Required Legal Disclosures</h3>
                        
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                          <FormField
                            control={form.control}
                            name="legalDisclosures.fairHousingAcknowledged"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 bg-background border border-gray-200 dark:border-gray-700 rounded-none">
                                <FormControl>
                                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="font-bold">Fair Housing Act Acknowledgment</FormLabel>
                                  <FormDescription className="text-xs">
                                    I understand that this property is offered in compliance with the Fair Housing Act and that no applicant will be discriminated against based on race, color, religion, sex, disability, familial status, or national origin.
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="legalDisclosures.creditCheckAuthorized"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 bg-background border border-gray-200 dark:border-gray-700 rounded-none">
                                <FormControl>
                                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="font-bold">Background & Credit Check Authorization (FCRA)</FormLabel>
                                  <FormDescription className="text-xs">
                                    I authorize the property owner or their agent to obtain consumer reports, including credit, criminal, and eviction history, as permitted under the Fair Credit Reporting Act.
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="legalDisclosures.accuracyCertified"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 bg-background border border-gray-200 dark:border-gray-700 rounded-none">
                                <FormControl>
                                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="font-bold">Application Accuracy & Fraud Warning</FormLabel>
                                  <FormDescription className="text-xs">
                                    I certify that all information provided is true and complete. I understand that false or misleading information may result in denial of my application or termination of tenancy.
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="legalDisclosures.feeAcknowledged"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 bg-background border border-gray-200 dark:border-gray-700 rounded-none">
                                <FormControl>
                                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="font-bold">Non-Refundable Application Fee Disclosure</FormLabel>
                                  <FormDescription className="text-xs">
                                    I understand that the application fee, if charged, is non-refundable once processing begins.
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {property?.state && getRequiredDisclosures(property.state).length > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-none space-y-6 border border-blue-100 dark:border-blue-800 mt-6">
                          <h3 className="text-sm font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-4">State Required Disclosures ({property.state})</h3>
                          
                          <div className="space-y-4">
                            {getRequiredDisclosures(property.state).map((disclosure) => (
                              <FormField
                                key={disclosure.id}
                                control={form.control}
                                name={`stateDisclosures.${disclosure.id}.acknowledged`}
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-4 bg-background border border-blue-200 dark:border-blue-800 rounded-none">
                                    <FormControl>
                                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                      <FormLabel className="font-bold">{disclosure.label}</FormLabel>
                                      <FormDescription className="text-xs">
                                        {disclosure.text}
                                      </FormDescription>
                                    </div>
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <div className="flex justify-between items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const prevStep = currentStep - 1;
                      setCurrentStep(prevStep);
                      autosave(getValues(), prevStep);
                    }}
                    disabled={currentStep === 1 || isProcessing}
                    className="h-12 px-8 rounded-none font-black uppercase tracking-widest"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Previous
                  </Button>

                  {currentStep < 9 ? (
                    <Button
                      type="button"
                      onClick={() => {
                        const nextStep = currentStep + 1;
                        setCurrentStep(nextStep);
                        autosave(getValues(), nextStep);
                      }}
                      disabled={isProcessing}
                      className="h-12 px-8 rounded-none font-black uppercase tracking-widest"
                    >
                      Next Step
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={
                        isProcessing || 
                        !form.watch("legalDisclosures.fairHousingAcknowledged") ||
                        !form.watch("legalDisclosures.creditCheckAuthorized") ||
                        !form.watch("legalDisclosures.accuracyCertified") ||
                        !form.watch("legalDisclosures.feeAcknowledged") ||
                        !!(property?.state && getRequiredDisclosures(property.state).some(d => !form.watch(`stateDisclosures.${d.id}.acknowledged`)))
                      }
                      className="h-12 px-12 bg-primary hover:bg-primary/90 text-white rounded-none font-black uppercase tracking-widest shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "Submit Final Application"
                      )}
                    </Button>
                  )}
                </div>
              </form>
            </Form>

            <div className="mt-12 text-center space-y-4">
              <SecurityBadges />
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">
                Securely processed by Choice Properties Application System
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
