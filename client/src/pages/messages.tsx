import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { 
  MessageSquare, 
  Send, 
  Plus, 
  ArrowLeft,
  Search,
  Building2
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

interface Conversation {
  id: string;
  subject: string | null;
  property_id: string | null;
  application_id: string | null;
  created_at: string;
  updated_at: string;
  lastMessage?: {
    content: string;
    created_at: string;
  };
  unreadCount?: number;
  participants?: Array<{
    user_id: string;
    users: {
      id: string;
      full_name: string;
      profile_image: string | null;
    };
  }>;
  properties?: {
    id: string;
    title: string;
    address: string;
  } | null;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  attachments: string[] | null;
  created_at: string;
  users?: {
    id: string;
    full_name: string;
    profile_image: string | null;
  };
}

export default function Messages() {
  const { user, isLoggedIn } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [newConversationData, setNewConversationData] = useState({
    participantId: "",
    propertyId: "",
    subject: "",
    initialMessage: ""
  });

  const { data: conversationsResponse, isLoading: loadingConversations } = useQuery<{ data: Conversation[] }>({
    queryKey: ["/api/conversations"],
    enabled: isLoggedIn
  });

  const conversations: Conversation[] = conversationsResponse?.data || [];

  const { data: messagesResponse, isLoading: loadingMessages } = useQuery<{ data: Conversation & { messages: Message[] } }>({
    queryKey: ["/api/conversations", selectedConversation],
    enabled: !!selectedConversation && isLoggedIn
  });

  const selectedConversationData = messagesResponse?.data;

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { conversationId: string; content: string }) => {
      const response = await apiRequest("POST", `/api/conversations/${data.conversationId}/messages`, { content: data.content });
      return response.json();
    },
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConversation] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  });

  const createConversationMutation = useMutation({
    mutationFn: async (data: { participantIds: string[]; propertyId?: string; subject?: string; initialMessage?: string }) => {
      const response = await apiRequest("POST", "/api/conversations", data);
      return response.json();
    },
    onSuccess: (data) => {
      setNewConversationOpen(false);
      setNewConversationData({ participantId: "", propertyId: "", subject: "", initialMessage: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      if (data?.data?.id) {
        setSelectedConversation(data.data.id);
      }
      toast({
        title: "Success",
        description: "Conversation started"
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create conversation",
        variant: "destructive"
      });
    }
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const response = await apiRequest("PATCH", `/api/conversations/${conversationId}/read`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    }
  });

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversation(conversationId);
    markAsReadMutation.mutate(conversationId);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;
    sendMessageMutation.mutate({
      conversationId: selectedConversation,
      content: newMessage.trim()
    });
  };

  const handleCreateConversation = () => {
    if (!newConversationData.participantId || !newConversationData.initialMessage.trim()) {
      toast({
        title: "Error",
        description: "Please select a recipient and enter a message",
        variant: "destructive"
      });
      return;
    }
    createConversationMutation.mutate({
      participantIds: [newConversationData.participantId],
      propertyId: newConversationData.propertyId || undefined,
      subject: newConversationData.subject || undefined,
      initialMessage: newConversationData.initialMessage
    });
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    const subjectMatch = conv.subject?.toLowerCase().includes(searchLower);
    const propertyMatch = conv.properties?.title?.toLowerCase().includes(searchLower);
    const participantMatch = conv.participants?.some(p => 
      p.users?.full_name?.toLowerCase().includes(searchLower)
    );
    return subjectMatch || propertyMatch || participantMatch;
  });

  const getOtherParticipants = (conv: Conversation) => {
    return conv.participants?.filter(p => p.user_id !== user?.id) || [];
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Card className="p-6">
            <p className="text-muted-foreground">Please log in to view messages</p>
            <Button className="mt-4" onClick={() => navigate("/login")}>Log In</Button>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Messages</h1>
          </div>
          <Dialog open={newConversationOpen} onOpenChange={setNewConversationOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-conversation">
                <Plus className="h-4 w-4 mr-2" />
                New Message
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start New Conversation</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Subject (optional)</Label>
                  <Input
                    data-testid="input-conversation-subject"
                    placeholder="What is this about?"
                    value={newConversationData.subject}
                    onChange={e => setNewConversationData(prev => ({ ...prev, subject: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Recipient ID</Label>
                  <Input
                    data-testid="input-recipient-id"
                    placeholder="Enter recipient user ID"
                    value={newConversationData.participantId}
                    onChange={e => setNewConversationData(prev => ({ ...prev, participantId: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">Enter the user ID of the person you want to message</p>
                </div>
                <div className="space-y-2">
                  <Label>Related Property (optional)</Label>
                  <Input
                    data-testid="input-property-id"
                    placeholder="Enter property ID if related to a property"
                    value={newConversationData.propertyId}
                    onChange={e => setNewConversationData(prev => ({ ...prev, propertyId: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    data-testid="input-initial-message"
                    placeholder="Type your message..."
                    value={newConversationData.initialMessage}
                    onChange={e => setNewConversationData(prev => ({ ...prev, initialMessage: e.target.value }))}
                    rows={4}
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleCreateConversation}
                  disabled={createConversationMutation.isPending}
                  data-testid="button-send-new-message"
                >
                  {createConversationMutation.isPending ? "Sending..." : "Start Conversation"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-250px)] min-h-[500px]">
          <Card className="lg:col-span-1 flex flex-col">
            <CardHeader className="pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  data-testid="input-search-conversations"
                  placeholder="Search conversations..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <ScrollArea className="h-full">
                {loadingConversations ? (
                  <div className="p-4 text-center text-muted-foreground">Loading...</div>
                ) : filteredConversations.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No conversations yet
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredConversations.map(conv => {
                      const others = getOtherParticipants(conv);
                      const firstOther = others[0]?.users;
                      const isSelected = selectedConversation === conv.id;
                      
                      return (
                        <button
                          key={conv.id}
                          data-testid={`button-conversation-${conv.id}`}
                          className={`w-full p-4 text-left transition-colors hover-elevate ${
                            isSelected ? "bg-accent" : ""
                          }`}
                          onClick={() => handleSelectConversation(conv.id)}
                        >
                          <div className="flex items-start gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={firstOther?.profile_image || undefined} />
                              <AvatarFallback>{getInitials(firstOther?.full_name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium truncate">
                                  {firstOther?.full_name || "Unknown"}
                                </span>
                                {conv.unreadCount && conv.unreadCount > 0 && (
                                  <Badge variant="default" className="shrink-0" data-testid={`badge-unread-${conv.id}`}>
                                    {conv.unreadCount}
                                  </Badge>
                                )}
                              </div>
                              {conv.subject && (
                                <p className="text-sm text-muted-foreground truncate">{conv.subject}</p>
                              )}
                              {conv.lastMessage && (
                                <p className="text-sm text-muted-foreground truncate mt-1">
                                  {conv.lastMessage.content}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                {conv.properties && (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Building2 className="h-3 w-3" />
                                    <span className="truncate max-w-[100px]">{conv.properties.title}</span>
                                  </div>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(conv.updated_at), "MMM d")}
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 flex flex-col">
            {selectedConversation && selectedConversationData ? (
              <>
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="lg:hidden"
                        onClick={() => setSelectedConversation(null)}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {getInitials(
                            selectedConversationData.participants
                              ?.find(p => p.user_id !== user?.id)
                              ?.users?.full_name
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold" data-testid="text-conversation-title">
                          {selectedConversationData.subject || 
                            selectedConversationData.participants
                              ?.find(p => p.user_id !== user?.id)
                              ?.users?.full_name || 
                            "Conversation"}
                        </h3>
                        {selectedConversationData.properties && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {selectedConversationData.properties.title}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 p-0 flex flex-col min-h-0">
                  <ScrollArea className="flex-1 p-4">
                    {loadingMessages ? (
                      <div className="text-center text-muted-foreground py-4">Loading messages...</div>
                    ) : (
                      <div className="space-y-4">
                        {selectedConversationData.messages?.map(msg => {
                          const isMine = msg.sender_id === user?.id;
                          return (
                            <div
                              key={msg.id}
                              data-testid={`message-${msg.id}`}
                              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                            >
                              <div className={`max-w-[70%] ${isMine ? "order-2" : "order-1"}`}>
                                {!isMine && (
                                  <div className="flex items-center gap-2 mb-1">
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage src={msg.users?.profile_image || undefined} />
                                      <AvatarFallback>{getInitials(msg.users?.full_name)}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs text-muted-foreground">{msg.users?.full_name}</span>
                                  </div>
                                )}
                                <div
                                  className={`rounded-lg px-4 py-2 ${
                                    isMine 
                                      ? "bg-primary text-primary-foreground" 
                                      : "bg-muted"
                                  }`}
                                >
                                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                </div>
                                <p className={`text-xs text-muted-foreground mt-1 ${isMine ? "text-right" : ""}`}>
                                  {format(new Date(msg.created_at), "MMM d, h:mm a")}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                  <Separator />
                  <form onSubmit={handleSendMessage} className="p-4">
                    <div className="flex gap-2">
                      <Input
                        data-testid="input-message"
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        disabled={sendMessageMutation.isPending}
                      />
                      <Button 
                        type="submit" 
                        size="icon"
                        disabled={!newMessage.trim() || sendMessageMutation.isPending}
                        data-testid="button-send-message"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a conversation to view messages</p>
                  <p className="text-sm mt-2">or start a new conversation</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
