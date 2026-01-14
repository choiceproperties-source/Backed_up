import { useState, useEffect, useCallback } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { cn } from "@/lib/utils";
import {
  FileText,
  MapPin,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Shield,
  AlertCircle,
  Info,
  Check,
  Ban,
  PawPrint
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
import SecurityBadges from "@/components/shared/SecurityBadges";
import { AutosaveIndicator } from "@/components/application/AutosaveIndicator";
import type { Property } from "@shared/schema";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

const applyFormSchema = z.object({
  propertyId: z.string(),
  // Personal Information
  firstName: z.string().min(2, "First name is required"),
  lastName: z.string().min(2, "Last name is required"),
  email: z.string().email("Valid email address is required"),
  phone: z.string().min(10, "Phone number is required"),
  dateOfBirth: z.string().refine((date) => {
    if (!date) return false;
    const birthDate = new Date(date);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 18;
  }, "You must be at least 18 years old"),
  currentAddress: z.string().min(5, "Current address is required"),

  // Employment
  employerName: z.string().min(2, "Employer name is required"),
  jobTitle: z.string().min(2, "Job title is required"),
  monthlyIncome: z.string().min(1, "Monthly income is required"),
  employmentDuration: z.string().min(1, "Employment duration is required"),

  // Emergency Contact
  emergencyContactName: z.string().min(2, "Emergency contact name is required"),
  emergencyContactPhone: z.string().min(10, "Emergency contact phone is required"),
  emergencyContactRelationship: z.string().min(2, "Relationship is required"),

  // Rental History
  currentLandlordName: z.string().optional(),
  currentLandlordPhone: z.string().optional(),
  currentRentAmount: z.string().optional(),
  reasonForMoving: z.string().optional(),

  // Reference
  refName: z.string().optional(),
  refPhone: z.string().optional(),
  refRelation: z.string().optional(),

  // Pets & Vehicles
  hasPets: z.boolean().default(false),
  petDetails: z.string().optional(),
  hasVehicles: z.boolean().default(false),
  vehicleDetails: z.string().optional(),

  // Legal Disclosures
  hasEvictions: z.boolean().default(false),
  hasFelonies: z.boolean().default(false),
  hasBankruptcies: z.boolean().default(false),

  // Property Rules
  acknowledgePetPolicy: z.boolean().default(false).refine(val => val === true, "You must acknowledge the pet policy"),
  acknowledgeSmokingPolicy: z.boolean().default(false).refine(val => val === true, "You must acknowledge the smoking policy"),

  // Final Submission
  rulesAcknowledged: z.boolean().refine(val => val === true, "You must acknowledge all property rules"),
  agreeToBackgroundCheck: z.boolean().refine(val => val === true, "You must agree to background check"),
  agreeToTerms: z.boolean().refine(val => val === true, "You must agree to the terms"),
  signature: z.string().min(2, "Signature is required"),
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
    { id: 1, label: "Personal Info", fields: ["firstName", "lastName", "email", "phone", "dateOfBirth", "currentAddress"] },
    { id: 2, label: "Employment", fields: ["employerName", "jobTitle", "monthlyIncome", "employmentDuration"] },
    { id: 3, label: "Emergency Contact", fields: ["emergencyContactName", "emergencyContactPhone", "emergencyContactRelationship"] },
    { id: 4, label: "Rental History", fields: ["currentLandlordName", "currentLandlordPhone", "currentRentAmount", "reasonForMoving"] },
    { id: 5, label: "Pets & Vehicles", fields: ["hasPets", "petDetails", "hasVehicles", "vehicleDetails"] },
    { id: 6, label: "Review & Submit", fields: ["rulesAcknowledged", "agreeToBackgroundCheck", "agreeToTerms", "signature"] }
  ];

  const handleNext = async () => {
    const currentStepFields = steps[currentStep - 1].fields as (keyof ApplyFormValues)[];
    const isValid = await form.trigger(currentStepFields);

    if (!isValid) {
      toast({
        title: "Please fix errors",
        description: "Some fields need your attention before proceeding.",
        variant: "destructive",
      });
      return;
    }

    if (currentStep < steps.length) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      await autosave(form.getValues(), nextStep);
      window.scrollTo(0, 0);
    } else {
      await form.handleSubmit(onSubmit)();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      autosave(form.getValues(), prevStep);
      window.scrollTo(0, 0);
    }
  };

  const { data: propertyResponse, isLoading: isLoadingProperty } = useQuery<ApiResponse<Property>>({
    queryKey: [`/api/properties/${params?.id}`],
    enabled: !!params?.id
  });

  const property = propertyResponse?.data;

  const { data: draftResponse, isLoading: isLoadingDraft } = useQuery<ApiResponse<any>>({
    queryKey: [`/api/applications/draft?propertyId=${params?.id}`],
    enabled: !!params?.id && !applicationId
  });

  const draft = draftResponse?.data;

  const form = useForm<ApplyFormValues>({
    resolver: zodResolver(applyFormSchema),
    mode: "onBlur",
    defaultValues: {
      propertyId: params?.id || "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      dateOfBirth: "",
      currentAddress: "",
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
      refName: "",
      refPhone: "",
      refRelation: "",
      hasPets: false,
      petDetails: "",
      hasVehicles: false,
      vehicleDetails: "",
      hasEvictions: false,
      hasFelonies: false,
      hasBankruptcies: false,
      acknowledgePetPolicy: false,
      acknowledgeSmokingPolicy: false,
      rulesAcknowledged: false,
      agreeToBackgroundCheck: false,
      agreeToTerms: false,
      signature: "",
    },
  });

  useEffect(() => {
    if (draft) {
      setApplicationId(draft.id);
      form.reset({
        propertyId: params?.id || "",
        firstName: draft.firstName || "",
        lastName: draft.lastName || "",
        email: draft.email || "",
        phone: draft.phone || "",
        dateOfBirth: draft.dateOfBirth || "",
        currentAddress: draft.currentAddress || "",
        employerName: draft.employerName || "",
        jobTitle: draft.jobTitle || "",
        monthlyIncome: draft.monthlyIncome || "",
        employmentDuration: draft.employmentDuration || "",
        emergencyContactName: draft.emergencyContactName || "",
        emergencyContactPhone: draft.emergencyContactPhone || "",
        emergencyContactRelationship: draft.emergencyContactRelationship || "",
        currentLandlordName: draft.currentLandlordName || "",
        currentLandlordPhone: draft.currentLandlordPhone || "",
        currentRentAmount: draft.currentRentAmount || "",
        reasonForMoving: draft.reasonForMoving || "",
        refName: draft.refName || "",
        refPhone: draft.refPhone || "",
        refRelation: draft.refRelation || "",
        hasPets: draft.hasPets || false,
        petDetails: draft.petDetails || "",
        hasVehicles: draft.hasVehicles || false,
        vehicleDetails: draft.vehicleDetails || "",
        hasEvictions: draft.hasEvictions || false,
        hasFelonies: draft.hasFelonies || false,
        hasBankruptcies: draft.hasBankruptcies || false,
        acknowledgePetPolicy: draft.acknowledgePetPolicy || false,
        acknowledgeSmokingPolicy: draft.acknowledgeSmokingPolicy || false,
        rulesAcknowledged: draft.rulesAcknowledged || false,
        agreeToBackgroundCheck: draft.agreeToBackgroundCheck || false,
        agreeToTerms: draft.agreeToTerms || false,
        signature: draft.signature || "",
      });

      if (draft.status === 'submitted') {
        setIsSubmitted(true);
      }
    }
  }, [draft, form, params?.id]);

  const autosave = useCallback(async (values: ApplyFormValues, step: number) => {
    if (!params?.id) return;

    setSaveStatus('saving');
    try {
      const payload = {
        step: step,
        ...values
      };

      let response;
      if (applicationId) {
        response = await apiRequest("PATCH", `/api/applications/${applicationId}/autosave`, payload);
      } else {
        response = await apiRequest("POST", "/api/applications", { ...payload, status: 'draft' });
      }

      if (!response.ok) {
        throw new Error("Save failed");
      }

      const data = await response.json();
      if (!applicationId && data.success) {
        setApplicationId(data.data.id);
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [params?.id, applicationId]);

  const handleBlur = (fieldName: keyof ApplyFormValues) => {
    form.trigger(fieldName);
    autosave(form.getValues(), currentStep);
  };

  const onSubmit = async (values: ApplyFormValues) => {
    console.log("[Apply] onSubmit triggered with values:", values);
    if (!applicationId) {
      toast({
        title: "Error",
        description: "Please wait for the form to save before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const submitResponse = await apiRequest("PATCH", `/api/applications/${applicationId}/status`, { 
        status: "submitted",
        ...values // Pass all values to ensure backend has everything for final submission
      });

      if (!submitResponse.ok) {
        const errorData = await submitResponse.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || "Submission failed");
      }

      setIsSubmitted(true);
      toast({
        title: "Application Submitted",
        description: "Your rental application has been received successfully.",
      });
    } catch (error: any) {
      console.error("[Apply] Submission error:", error);
      toast({
        title: "Submission Error",
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center space-y-6">
        <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full">
          <CheckCircle2 className="w-16 h-16 text-green-600 dark:text-green-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Application Submitted!</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Your application for <strong>{property?.title || "the property"}</strong> has been received.
          </p>
        </div>

        <div className="flex gap-4">
          <Button variant="outline" onClick={() => setLocation("/")} className="h-12 px-8">
            Return Home
          </Button>
          <Button onClick={() => window.print()} className="h-12 px-8">
            Print Copy
          </Button>
        </div>
      </div>
    );
  }

  const progressPercentage = ((currentStep - 1) / (steps.length - 1)) * 100;

  const StepIndicator = () => (
    <div className="flex flex-col gap-4 mb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center font-bold",
            steps[currentStep - 1].fields.some(f => form.formState.errors[f as keyof ApplyFormValues])
              ? "bg-destructive/10 text-destructive border-2 border-destructive"
              : "bg-primary/10 text-primary"
          )}>
            {currentStep}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Step {currentStep} of {steps.length}</p>
            <h3 className="text-xl font-bold">{steps[currentStep - 1].label}</h3>
          </div>
        </div>
        <AutosaveIndicator status={saveStatus} />
      </div>
      <div className="flex items-center gap-1.5 h-2">
        {steps.map((step) => {
          const hasError = step.fields.some(f => form.formState.errors[f as keyof ApplyFormValues]);
          const isCurrent = currentStep === step.id;
          const isCompleted = currentStep > step.id;

          return (
            <div
              key={step.id}
              className={cn(
                "h-full flex-1 rounded-full transition-all",
                hasError ? "bg-destructive" :
                isCompleted ? "bg-primary" : 
                isCurrent ? "bg-primary/30" : 
                "bg-muted"
              )}
            />
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="bg-gradient-to-r from-primary to-primary/80 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <FileText className="h-8 w-8" />
              Rental Application
            </h1>
            {property && (
              <div className="mt-4 p-4 bg-white/10 backdrop-blur-sm rounded-lg">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                  <div className="flex-1">
                    <p className="text-sm font-semibold uppercase tracking-wider text-primary-foreground/80">
                      {property.propertyType || 'Residential'}
                    </p>
                    <h2 className="text-xl font-bold leading-tight">{property.title}</h2>
                    <p className="text-white/90 text-sm flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {property.address}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold uppercase tracking-wider text-primary-foreground/80">
                      Monthly Rent
                    </p>
                    <p className="text-2xl font-bold">${parseFloat(String(property.price || 0)).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 bg-gray-50/50 dark:bg-gray-900/50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-950 rounded-lg shadow-sm p-6 mb-6">
              <StepIndicator />
            </div>

                <Form {...form}>
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      console.log("[Apply] Form submit event intercepted");
                      form.handleSubmit(onSubmit, (errors) => {
                        console.error("[Apply] Form validation failed on submit:", errors);
                        toast({
                          title: "Validation Error",
                          description: "Please check all steps for missing required information.",
                          variant: "destructive",
                        });
                      })(e);
                    }} 
                    className="space-y-8"
                  >
                {/* Step 1: Personal Info */}
                {currentStep === 1 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Personal Information</CardTitle>
                      <CardDescription>Tell us about yourself</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>First Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Legal first name" {...field} onBlur={() => handleBlur("firstName")} />
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
                              <FormLabel>Last Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Legal last name" {...field} onBlur={() => handleBlur("lastName")} />
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
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="email@example.com" {...field} onBlur={() => handleBlur("email")} />
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
                              <FormLabel>Phone</FormLabel>
                              <FormControl>
                                <Input placeholder="(555) 000-0000" {...field} onBlur={() => handleBlur("phone")} />
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
                              <FormLabel>Date of Birth</FormLabel>
                              <FormControl>
                                <Input type="date" {...field} onBlur={() => handleBlur("dateOfBirth")} />
                              </FormControl>
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
                            <FormLabel>Current Address</FormLabel>
                            <FormControl>
                              <Input placeholder="Street, City, State, Zip" {...field} onBlur={() => handleBlur("currentAddress")} />
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
                  <Card>
                    <CardHeader>
                      <CardTitle>Employment & Income</CardTitle>
                      <CardDescription>Current employment details</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="employerName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Employer Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Current Company" {...field} onBlur={() => handleBlur("employerName")} />
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
                              <FormLabel>Job Title</FormLabel>
                              <FormControl>
                                <Input placeholder="Software Engineer" {...field} onBlur={() => handleBlur("jobTitle")} />
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
                              <FormLabel>Monthly Income</FormLabel>
                              <FormControl>
                                <Input placeholder="5000" {...field} onBlur={() => handleBlur("monthlyIncome")} />
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
                              <FormLabel>Duration</FormLabel>
                              <FormControl>
                                <Input placeholder="2 Years" {...field} onBlur={() => handleBlur("employmentDuration")} />
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
                  <Card>
                    <CardHeader>
                      <CardTitle>Emergency Contact</CardTitle>
                      <CardDescription>Who should we contact in case of emergency?</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <FormField
                        control={form.control}
                        name="emergencyContactName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Full Name" {...field} onBlur={() => handleBlur("emergencyContactName")} />
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
                              <FormLabel>Phone Number</FormLabel>
                              <FormControl>
                                <Input placeholder="(555) 000-0000" {...field} onBlur={() => handleBlur("emergencyContactPhone")} />
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
                              <FormLabel>Relationship</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Spouse, Parent" {...field} onBlur={() => handleBlur("emergencyContactRelationship")} />
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
                  <Card>
                    <CardHeader>
                      <CardTitle>Rental History</CardTitle>
                      <CardDescription>Information about your current residence</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="currentLandlordName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Landlord Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Current Landlord" {...field} onBlur={() => handleBlur("currentLandlordName")} />
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
                              <FormLabel>Landlord Phone</FormLabel>
                              <FormControl>
                                <Input placeholder="(555) 000-0000" {...field} onBlur={() => handleBlur("currentLandlordPhone")} />
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
                              <FormLabel>Current Rent</FormLabel>
                              <FormControl>
                                <Input placeholder="1500" {...field} onBlur={() => handleBlur("currentRentAmount")} />
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
                              <FormLabel>Reason for Moving</FormLabel>
                              <FormControl>
                                <Input placeholder="Relocation, Upsizing, etc." {...field} onBlur={() => handleBlur("reasonForMoving")} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Step 5: Pets & Vehicles */}
                {currentStep === 5 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Pets & Vehicles</CardTitle>
                      <CardDescription>Additional information for property management</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                      <div className="space-y-6">
                        <FormField
                          control={form.control}
                          name="hasPets"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="font-semibold">I have pets</FormLabel>
                                <FormDescription>Select if you intend to bring pets to the property</FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                        {form.watch("hasPets") && (
                          <FormField
                            control={form.control}
                            name="petDetails"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Pet Details</FormLabel>
                                <FormControl>
                                  <Textarea placeholder="Type, breed, and weight of each pet" {...field} onBlur={() => handleBlur("petDetails")} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>

                      <Separator />

                      <div className="space-y-6">
                        <FormField
                          control={form.control}
                          name="hasVehicles"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="font-semibold">I have vehicles</FormLabel>
                                <FormDescription>Select if you require parking for any vehicles</FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                        {form.watch("hasVehicles") && (
                          <FormField
                            control={form.control}
                            name="vehicleDetails"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Vehicle Details</FormLabel>
                                <FormControl>
                                  <Textarea placeholder="Make, model, and year of each vehicle" {...field} onBlur={() => handleBlur("vehicleDetails")} />
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

                {/* Step 6: Review & Submit */}
                {currentStep === 6 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Review & Submit</CardTitle>
                      <CardDescription>Verify all information and provide signature</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                      <div className="space-y-6">
                        <h3 className="text-lg font-semibold">Application Summary</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                            <h4 className="font-medium text-sm text-muted-foreground">Personal Information</h4>
                            <div className="space-y-2 text-sm">
                              <p><span className="text-muted-foreground">Name:</span> {form.watch("firstName")} {form.watch("lastName")}</p>
                              <p><span className="text-muted-foreground">Email:</span> {form.watch("email")}</p>
                              <p><span className="text-muted-foreground">Phone:</span> {form.watch("phone")}</p>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <h4 className="font-medium text-sm text-muted-foreground">Employment</h4>
                            <div className="space-y-2 text-sm">
                              <p><span className="text-muted-foreground">Employer:</span> {form.watch("employerName")}</p>
                              <p><span className="text-muted-foreground">Income:</span> ${form.watch("monthlyIncome")}/month</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      {property && (
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">Property Rules</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(property as any).pets_allowed !== undefined && (
                              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <PawPrint className="h-4 w-4" />
                                  <span className="font-medium">Pet Policy</span>
                                </div>
                                <p className="text-sm">{(property as any).pets_allowed ? "Pets Allowed" : "No Pets Allowed"}</p>
                              </div>
                            )}
                            {(property as any).smoking_allowed !== undefined && (
                              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <Ban className="h-4 w-4" />
                                  <span className="font-medium">Smoking Policy</span>
                                </div>
                                <p className="text-sm">{(property as any).smoking_allowed ? "Smoking Allowed" : "No Smoking"}</p>
                              </div>
                            )}
                          </div>

                          <FormField
                            control={form.control}
                            name="acknowledgePetPolicy"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>I acknowledge the pet policy</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="acknowledgeSmokingPolicy"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>I acknowledge the smoking policy</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>
                      )}

                      <div className="space-y-6">
                        <h3 className="text-lg font-semibold">Legal Acknowledgments</h3>

                        <FormField
                          control={form.control}
                          name="rulesAcknowledged"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>I acknowledge all property rules</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="agreeToBackgroundCheck"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>I agree to a background check</FormLabel>
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
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>I agree to the application terms</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="signature"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Electronic Signature</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Type your full legal name" 
                                {...field}
                                onBlur={() => handleBlur("signature")}
                              />
                            </FormControl>
                            <FormDescription>
                              By typing your name, you are legally signing this application
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                )}

                <div className="flex justify-between items-center gap-4 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={currentStep === 1 || isProcessing}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>

                  <div className="flex items-center gap-4">
                    {currentStep < steps.length ? (
                      <Button
                        type="button"
                        onClick={handleNext}
                        disabled={isProcessing}
                        className="flex items-center gap-2"
                      >
                        Next Step
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        disabled={isProcessing}
                        className="flex items-center gap-2"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            Submit Application
                            <CheckCircle2 className="h-4 w-4" />
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </form>
            </Form>

            <div className="mt-12 text-center space-y-4">
              <SecurityBadges />
              <p className="text-xs text-muted-foreground">
                Your information is securely processed
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}