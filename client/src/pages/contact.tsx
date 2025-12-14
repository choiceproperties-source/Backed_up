import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Breadcrumb } from "@/components/breadcrumb";
import { trackFormCompletion } from "@/lib/pwa";
import { updateMetaTags } from "@/lib/seo";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  subject: z.string().min(3, "Subject must be at least 3 characters"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

export default function Contact() {
  useEffect(() => {
    updateMetaTags({
      title: "Contact Us - Choice Properties",
      description: "Get in touch with Choice Properties. Fill out our contact form and we'll be in touch soon.",
      image: "https://choiceproperties.com/og-image.png",
      url: "https://choiceproperties.com/contact"
    });
  }, []);

  const { toast } = useToast();
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success">("idle");

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
    },
  });

  const contactMutation = useMutation({
    mutationFn: async (data: ContactFormValues) => {
      const response = await apiRequest("POST", "/api/contact", data);
      return response.json();
    },
    onSuccess: () => {
      trackFormCompletion("contact", true);
      setSubmitStatus("success");
      form.reset();
      toast({
        title: "Message Sent!",
        description: "We'll get back to you as soon as possible."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send message",
        description: error.message || "Please try again later.",
        variant: "destructive"
      });
    },
  });

  const onSubmit = (data: ContactFormValues) => {
    contactMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <Breadcrumb items={[{ label: "Contact" }]} />
      
      <div className="bg-primary py-16 text-center">
        <h1 className="font-heading text-4xl font-bold text-white mb-4" data-aos="zoom-in">Contact Us</h1>
        <p className="text-primary-foreground/80 max-w-xl mx-auto px-4" data-aos="fade-up" data-aos-delay="200">
          We're here to help. Reach out to us for any inquiries or support.
        </p>
      </div>

      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <div className="space-y-8" data-aos="fade-up">
            <Card className={submitStatus === "success" ? "border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800" : ""}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>Send us a Message</CardTitle>
                  {submitStatus === "success" && (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {submitStatus === "success" ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-green-900 dark:text-green-100 mb-2">Message Sent Successfully!</h3>
                    <p className="text-green-800 dark:text-green-200 mb-4">Thank you for contacting us. We'll respond within 24 hours.</p>
                    <Button onClick={() => setSubmitStatus("idle")} variant="outline" data-testid="button-send-another">
                      Send Another Message
                    </Button>
                  </div>
                ) : (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Your Name" 
                                  disabled={contactMutation.isPending}
                                  data-testid="input-name"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input 
                                  type="email" 
                                  placeholder="your@email.com" 
                                  disabled={contactMutation.isPending}
                                  data-testid="input-email"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="subject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subject</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="How can we help?" 
                                disabled={contactMutation.isPending}
                                data-testid="input-subject"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Message</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Your message..." 
                                className="min-h-[150px]" 
                                disabled={contactMutation.isPending}
                                data-testid="input-message"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit"
                        className="w-full bg-primary text-white font-bold h-12 hover:bg-primary/90" 
                        disabled={contactMutation.isPending}
                        data-testid="button-submit"
                      >
                        {contactMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          "Send Message"
                        )}
                      </Button>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}
