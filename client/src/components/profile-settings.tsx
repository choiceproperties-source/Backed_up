import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2 } from "lucide-react";
import { ImageCropper } from "./image-cropper";

const profileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  displayEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  displayPhone: z.string().optional().or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function ProfileSettings() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.full_name || "",
      displayEmail: user?.display_email || "",
      displayPhone: user?.display_phone || "",
    },
  });

  const onUpdateProfile = async (values: ProfileFormValues) => {
    setIsUpdating(true);
    try {
      await apiRequest("PATCH", "/api/v2/auth/profile", values);
      updateUser({ 
        full_name: values.fullName,
        display_email: values.displayEmail,
        display_phone: values.displayPhone
      });
      queryClient.invalidateQueries({ queryKey: ["/api/v2/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/v2/properties"] });
      toast({ title: "Success", description: "Profile updated successfully" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpload = async (croppedImage: string) => {
    if (!pendingFile) return;

    setCropImage(null);
    setIsUploading(true);
    try {
      const base64Data = croppedImage.split(",")[1];
      const uploadRes = await apiRequest("POST", "/api/upload-image", {
        file: {
          name: pendingFile.name,
          type: "image/jpeg",
          data: base64Data,
        },
        folder: "profile-images",
      });
      const uploadResult = await uploadRes.json();
      
      if (uploadResult.url) {
        await apiRequest("PATCH", "/api/v2/auth/profile", { profileImage: uploadResult.url });
        updateUser({ profile_image: uploadResult.url });
        queryClient.invalidateQueries({ queryKey: ["/api/v2/auth/me"] });
        queryClient.invalidateQueries({ queryKey: ["/api/v2/properties"] });
        toast({ title: "Success", description: "Profile picture updated" });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setPendingFile(null);
    }
  };

  const onImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "Please upload an image file", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Error", description: "File size must be less than 5MB", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setCropImage(reader.result as string);
      setPendingFile(file);
    };
  };

  const initials = user?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2) || "?";

  return (
    <>
      <Card className="max-w-2xl mx-auto shadow-sm">
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>
            Update your public profile information. This information is visible on your listings and profile page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6 pb-6 border-b">
            <div className="relative group">
              <Avatar className="h-24 w-24 border-4 border-background shadow-md">
                <AvatarImage src={user?.profile_image || undefined} />
                <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <label 
                htmlFor="avatar-upload"
                className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                {isUploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onImageUpload}
                disabled={isUploading}
              />
            </div>
            <div className="flex-1 text-center sm:text-left space-y-1">
              <h3 className="text-xl font-bold">{user?.full_name}</h3>
              <p className="text-sm text-muted-foreground uppercase tracking-widest font-semibold">{user?.role?.replace("_", " ")}</p>
              <p className="text-xs text-muted-foreground italic">Auth Email: {user?.email} (Cannot be changed)</p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onUpdateProfile)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="displayEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Public Contact Email</FormLabel>
                    <FormControl>
                      <Input placeholder="contact@example.com" {...field} />
                    </FormControl>
                    <FormDescription>
                      This email will be shown publicly to other users.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="displayPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Public Contact Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 (555) 000-0000" {...field} />
                    </FormControl>
                    <FormDescription>
                      Optional. Used for contact inquiries.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="pt-4">
                <Button type="submit" className="w-full sm:w-auto" disabled={isUpdating}>
                  {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {cropImage && (
        <ImageCropper
          image={cropImage}
          onCropComplete={handleUpload}
          onCancel={() => {
            setCropImage(null);
            setPendingFile(null);
          }}
        />
      )}
    </>
  );
}
