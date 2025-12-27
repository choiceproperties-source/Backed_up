import { useState, useEffect } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
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
  DollarSign
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
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PrivacyNotice from "@/components/shared/PrivacyNotice";
import SecurityBadges from "@/components/shared/SecurityBadges";

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
  agreeToBackgroundCheck: z.boolean().refine(val => val === true, "You must agree to the background check"),
  agreeToTerms: z.boolean().refine(val => val === true, "You must agree to the terms"),
  signature: z.string().min(2, "Electronic signature is required"),
});

type ApplyFormValues = z.infer<typeof applyFormSchema>;

export default function Apply() {
  const [, params] = useRoute("/apply/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const propertyId = params?.id;

  const { data: property, isLoading: isLoadingProperty } = useQuery({
    queryKey: ["/api/v2/properties", propertyId],
    enabled: !!propertyId,
  });

  const form = useForm<ApplyFormValues>({
    resolver: zodResolver(applyFormSchema),
    defaultValues: {
      propertyId: propertyId || "",
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
      agreeToBackgroundCheck: false,
      agreeToTerms: false,
      signature: "",
    },
  });

  useEffect(() => {
    if (propertyId) {
      form.setValue("propertyId", propertyId);
    }
  }, [propertyId, form]);

  const steps = [
    { id: 1, label: "Personal Information" },
    { id: 2, label: "Employment & Income" },
    { id: 3, label: "Emergency Contact" },
    { id: 4, label: "Review & Submit" },
  ];

  const nextStep = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep);
    const isValid = await form.trigger(fieldsToValidate as any);
    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length));
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo(0, 0);
  };

  const getFieldsForStep = (step: number) => {
    switch (step) {
      case 1:
        return ["firstName", "lastName", "email", "phone", "dateOfBirth", "currentAddress", "ssn"];
      case 2:
        return ["employerName", "jobTitle", "monthlyIncome", "employmentDuration"];
      case 3:
        return ["emergencyContactName", "emergencyContactPhone", "emergencyContactRelationship"];
      default:
        return [];
    }
  };

  const onSubmit = async (values: ApplyFormValues) => {
    setIsProcessing(true);
    try {
      await apiRequest("POST", "/api/v2/applications", values);
      setIsSubmitted(true);
      toast({
        title: "Application Submitted",
        description: "Your rental application has been received successfully.",
      });
      setTimeout(() => {
        setLocation("/dashboard");
      }, 3000);
    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error.message || "There was an error submitting your application.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoadingProperty) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <CheckCircle2 className="h-20 w-20 text-green-500 mb-6" />
        <h1 className="text-3xl font-bold mb-2">Application Received!</h1>
        <p className="text-muted-foreground mb-8 text-center max-w-md">
          Thank you for applying for {property?.title}. We've sent a confirmation email to {form.getValues("email")}.
        </p>
        <Button onClick={() => setLocation("/dashboard")}>Go to Dashboard</Button>
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
                    {property.images?.[0] && (
                      <img src={property.images[0]} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-black uppercase tracking-widest text-accent">{property.property_type || 'Residential'}</p>
                    <h2 className="text-xl font-bold leading-tight">{property.title}</h2>
                    <p className="text-white/80 text-sm flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {property.address}
                    </p>
                  </div>
                  <div className="text-right border-l border-white/20 pl-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-accent mb-1">Monthly Rent</p>
                    <p className="text-2xl font-black">${parseFloat(property.price).toLocaleString()}</p>
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
                <p className="text-xs font-black uppercase tracking-widest text-primary">
                  Step {currentStep}: {steps.find(s => s.id === currentStep)?.label}
                </p>
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
                        <span className="font-bold text-primary">${parseFloat(property.price).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 font-medium">Security Deposit</span>
                        <span className="font-bold text-primary">${parseFloat(property.price).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 font-medium">Lease Term</span>
                        <span className="font-bold capitalize">{property.lease_term || '12 Months'}</span>
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
                        <span className="font-bold">{property.pets_allowed ? "Pets Allowed" : "No Pets"}</span>
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
                                <Input placeholder="Enter your first name" className="h-12 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 focus:ring-primary rounded-none" {...field} />
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
                                <Input placeholder="Enter your last name" className="h-12 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 focus:ring-primary rounded-none" {...field} />
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
                                <Input placeholder="your.email@example.com" type="email" className="h-12 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 focus:ring-primary rounded-none" {...field} />
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
                          name="dateOfBirth"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-black uppercase tracking-widest text-gray-400">Date of Birth</FormLabel>
                              <FormControl>
                                <Input type="date" className="h-12 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 focus:ring-primary rounded-none" {...field} />
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
                                <Input placeholder="XXX-XX-XXXX" className="h-12 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 focus:ring-primary rounded-none" {...field} />
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
                              <Input placeholder="Enter your current street address, city, state, zip" className="h-12 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 focus:ring-primary rounded-none" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                    <CardFooter className="justify-end pt-6 border-t bg-gray-50/50 dark:bg-gray-900/50">
                      <Button type="button" onClick={nextStep} className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest h-12 px-8 rounded-none">
                        Next Step <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                )}

                {currentStep === 2 && (
                  <Card className="bg-white dark:bg-gray-950 border-gray-100 dark:border-gray-800 rounded-none shadow-xl">
                    <CardHeader className="border-b border-gray-50 dark:border-gray-900 pb-6">
                      <CardTitle className="text-2xl font-black tracking-tight">Employment & Income</CardTitle>
                      <CardDescription className="text-gray-500 font-medium">Verify your ability to pay rent.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="employerName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-black uppercase tracking-widest text-gray-400">Employer Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Current Company" className="h-12 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 focus:ring-primary rounded-none" {...field} />
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
                                <Input placeholder="Software Engineer" className="h-12 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 focus:ring-primary rounded-none" {...field} />
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
                                <Input placeholder="5000" type="number" className="h-12 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 focus:ring-primary rounded-none" {...field} />
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
                              <FormLabel className="text-xs font-black uppercase tracking-widest text-gray-400">Duration (Years/Months)</FormLabel>
                              <FormControl>
                                <Input placeholder="2 Years" className="h-12 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 focus:ring-primary rounded-none" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                    <CardFooter className="justify-between pt-6 border-t bg-gray-50/50 dark:bg-gray-900/50">
                      <Button type="button" variant="outline" onClick={prevStep} className="font-black uppercase tracking-widest h-12 rounded-none">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                      </Button>
                      <Button type="button" onClick={nextStep} className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest h-12 px-8 rounded-none">
                        Next Step <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                )}

                {currentStep === 3 && (
                  <Card className="bg-white dark:bg-gray-950 border-gray-100 dark:border-gray-800 rounded-none shadow-xl">
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
                            <FormLabel className="text-xs font-black uppercase tracking-widest text-gray-400">Contact Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Full Name" className="h-12 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 focus:ring-primary rounded-none" {...field} />
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
                                <Input placeholder="Spouse, Parent, Friend" className="h-12 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 focus:ring-primary rounded-none" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                    <CardFooter className="justify-between pt-6 border-t bg-gray-50/50 dark:bg-gray-900/50">
                      <Button type="button" variant="outline" onClick={prevStep} className="font-black uppercase tracking-widest h-12 rounded-none">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                      </Button>
                      <Button type="button" onClick={nextStep} className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest h-12 px-8 rounded-none">
                        Next Step <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                )}

                {currentStep === 4 && (
                  <Card className="bg-white dark:bg-gray-950 border-gray-100 dark:border-gray-800 rounded-none shadow-xl">
                    <CardHeader className="border-b border-gray-50 dark:border-gray-900 pb-6">
                      <CardTitle className="text-2xl font-black tracking-tight">Review & Submit</CardTitle>
                      <CardDescription className="text-gray-500 font-medium">Please review all information before submitting.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-8 space-y-6">
                      <FormField
                        control={form.control}
                        name="agreeToBackgroundCheck"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-none border border-gray-100 dark:border-gray-800 p-4">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-xs font-black uppercase tracking-widest">Background Check Consent</FormLabel>
                              <FormDescription className="text-[10px]">I authorize Choice Properties to conduct a background and credit check.</FormDescription>
                              <FormMessage />
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="agreeToTerms"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-none border border-gray-100 dark:border-gray-800 p-4">
                            <FormControl>
                              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-xs font-black uppercase tracking-widest">Terms & Conditions</FormLabel>
                              <FormDescription className="text-[10px]">I certify that all information is true and accurate.</FormDescription>
                              <FormMessage />
                            </div>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="signature"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-black uppercase tracking-widest text-gray-400">Electronic Signature (Full Name)</FormLabel>
                            <FormControl>
                              <Input placeholder="Type your full name" className="h-12 bg-gray-50/50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 focus:ring-primary rounded-none italic" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                    <CardFooter className="justify-between pt-6 border-t bg-gray-50/50 dark:bg-gray-900/50">
                      <Button type="button" variant="outline" onClick={prevStep} disabled={isProcessing} className="font-black uppercase tracking-widest h-12 rounded-none">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                      </Button>
                      <Button type="submit" disabled={isProcessing} className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest h-12 px-8 rounded-none">
                        {isProcessing ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
                        ) : (
                          <>Submit Application <CheckCircle2 className="ml-2 h-4 w-4" /></>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                )}
              </form>
            </Form>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
