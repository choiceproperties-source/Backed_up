import type { Express } from "express";
import { supabase } from "../supabase";
import { authenticateToken, requireRole, type AuthenticatedRequest } from "../auth-middleware";
import { success, error as errorResponse } from "../response";
import { insertNewsletterSubscriberSchema, insertContactMessageSchema } from "@shared/schema";
import { newsletterLimiter, inquiryLimiter } from "../rate-limit";

export function registerNewsletterRoutes(app: Express): void {
  app.post("/api/newsletter/subscribe", newsletterLimiter, async (req, res) => {
    try {
      const validation = insertNewsletterSubscriberSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }

      const { data, error } = await supabase
        .from("newsletter_subscribers")
        .insert([validation.data])
        .select();

      if (error) {
        if (error.code === "23505") {
          return res.json(success(null, "Already subscribed"));
        }
        throw error;
      }

      return res.json(success(data[0], "Subscribed successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to subscribe to newsletter"));
    }
  });

  app.get("/api/newsletter/subscribers", authenticateToken, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const { data, error } = await supabase
        .from("newsletter_subscribers")
        .select("*")
        .order("subscribed_at", { ascending: false });

      if (error) throw error;
      return res.json(success(data, "Newsletter subscribers fetched successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to fetch newsletter subscribers"));
    }
  });

  app.post("/api/messages", inquiryLimiter, async (req, res) => {
    try {
      const validation = insertContactMessageSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.errors[0].message });
      }

      const { data, error } = await supabase
        .from("contact_messages")
        .insert([validation.data])
        .select();

      if (error) throw error;
      return res.json(success(data[0], "Message sent successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to send message"));
    }
  });

  app.get("/api/messages", authenticateToken, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return res.json(success(data, "Contact messages fetched successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to fetch contact messages"));
    }
  });

  app.patch("/api/messages/:id", authenticateToken, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
    try {
      const { data, error } = await supabase
        .from("contact_messages")
        .update({ read: req.body.read })
        .eq("id", req.params.id)
        .select();

      if (error) throw error;
      return res.json(success(data[0], "Message updated successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to update message"));
    }
  });

  app.post("/api/contact", inquiryLimiter, async (req, res) => {
    try {
      const validation = insertContactMessageSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json(errorResponse(validation.error.errors[0].message));
      }

      const { data, error } = await supabase
        .from("contact_messages")
        .insert([validation.data])
        .select();

      if (error) throw error;
      return res.json(success(data[0], "Message sent successfully"));
    } catch (err: any) {
      return res.status(500).json(errorResponse("Failed to send message"));
    }
  });
}
