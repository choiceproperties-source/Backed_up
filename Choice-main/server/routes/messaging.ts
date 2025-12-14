import type { Express } from "express";
import { supabase } from "../supabase";
import { authenticateToken, type AuthenticatedRequest } from "../auth-middleware";
import { success, error as errorResponse } from "../response";

export function registerMessagingRoutes(app: Express): void {
  app.get("/api/conversations", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { data: participations, error: partError } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", req.user!.id);

      if (partError) throw partError;

      if (!participations || participations.length === 0) {
        return res.json(success([], "No conversations found"));
      }

      const conversationIds = participations.map(p => p.conversation_id);

      const { data: conversations, error } = await supabase
        .from("conversations")
        .select(`
          *,
          properties:property_id(id, title, address, images),
          conversation_participants(user_id, last_read_at, users:user_id(id, full_name, email, profile_image)),
          messages(id, content, sender_id, created_at)
        `)
        .in("id", conversationIds)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      const enrichedConversations = (conversations || []).map((conv: any) => {
        const lastMessage = conv.messages?.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
        const myParticipation = conv.conversation_participants?.find((p: any) => p.user_id === req.user!.id);
        const unreadCount = conv.messages?.filter((m: any) => 
          m.sender_id !== req.user!.id && 
          (!myParticipation?.last_read_at || new Date(m.created_at) > new Date(myParticipation.last_read_at))
        ).length || 0;

        return {
          ...conv,
          lastMessage,
          unreadCount,
          participants: conv.conversation_participants?.map((p: any) => p.users).filter(Boolean),
        };
      });

      return res.json(success(enrichedConversations, "Conversations fetched successfully"));
    } catch (err: any) {
      console.error("[MESSAGING] Get conversations error:", err);
      return res.status(500).json(errorResponse("Failed to fetch conversations"));
    }
  });

  app.get("/api/conversations/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { data: participation } = await supabase
        .from("conversation_participants")
        .select("id")
        .eq("conversation_id", req.params.id)
        .eq("user_id", req.user!.id)
        .single();

      if (!participation) {
        return res.status(403).json(errorResponse("Not authorized to view this conversation"));
      }

      const { data: conversation, error } = await supabase
        .from("conversations")
        .select(`
          *,
          properties:property_id(id, title, address, images),
          conversation_participants(user_id, last_read_at, users:user_id(id, full_name, email, profile_image)),
          messages(id, content, sender_id, message_type, attachments, created_at, users:sender_id(id, full_name, profile_image))
        `)
        .eq("id", req.params.id)
        .single();

      if (error) throw error;

      if (conversation?.messages) {
        conversation.messages = conversation.messages.sort((a: any, b: any) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      }

      return res.json(success(conversation, "Conversation fetched successfully"));
    } catch (err: any) {
      console.error("[MESSAGING] Get conversation error:", err);
      return res.status(500).json(errorResponse("Failed to fetch conversation"));
    }
  });

  app.post("/api/conversations", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { propertyId, applicationId, recipientId, subject, initialMessage } = req.body;

      if (!recipientId) {
        return res.status(400).json(errorResponse("Recipient is required"));
      }

      const { data: conversation, error: convError } = await supabase
        .from("conversations")
        .insert([{ property_id: propertyId, application_id: applicationId, subject }])
        .select()
        .single();

      if (convError) throw convError;

      await supabase.from("conversation_participants").insert([
        { conversation_id: conversation.id, user_id: req.user!.id },
        { conversation_id: conversation.id, user_id: recipientId },
      ]);

      if (initialMessage) {
        await supabase.from("messages").insert([{
          conversation_id: conversation.id,
          sender_id: req.user!.id,
          content: initialMessage,
        }]);
      }

      return res.json(success(conversation, "Conversation created successfully"));
    } catch (err: any) {
      console.error("[MESSAGING] Create conversation error:", err);
      return res.status(500).json(errorResponse("Failed to create conversation"));
    }
  });

  app.post("/api/conversations/:id/messages", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { data: participation } = await supabase
        .from("conversation_participants")
        .select("id")
        .eq("conversation_id", req.params.id)
        .eq("user_id", req.user!.id)
        .single();

      if (!participation) {
        return res.status(403).json(errorResponse("Not authorized to send messages to this conversation"));
      }

      const { content, messageType, attachments } = req.body;

      if (!content?.trim()) {
        return res.status(400).json(errorResponse("Message content is required"));
      }

      const { data: message, error } = await supabase
        .from("messages")
        .insert([{
          conversation_id: req.params.id,
          sender_id: req.user!.id,
          content: content.trim(),
          message_type: messageType || "text",
          attachments: attachments || null,
        }])
        .select(`*, users:sender_id(id, full_name, profile_image)`)
        .single();

      if (error) throw error;

      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", req.params.id);

      return res.json(success(message, "Message sent successfully"));
    } catch (err: any) {
      console.error("[MESSAGING] Send message error:", err);
      return res.status(500).json(errorResponse("Failed to send message"));
    }
  });

  app.patch("/api/conversations/:id/read", authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { error } = await supabase
        .from("conversation_participants")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", req.params.id)
        .eq("user_id", req.user!.id);

      if (error) throw error;
      return res.json(success(null, "Conversation marked as read"));
    } catch (err: any) {
      console.error("[MESSAGING] Mark read error:", err);
      return res.status(500).json(errorResponse("Failed to mark conversation as read"));
    }
  });
}
