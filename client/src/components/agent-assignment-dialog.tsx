import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserPlus, UserMinus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface Agent {
  id: string;
  fullName: string;
  email: string;
  role: string;
  profileImage?: string;
  agencyName?: string;
}

interface AgentAssignmentDialogProps {
  propertyId: string;
  currentAgentId?: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AgentAssignmentDialog({
  propertyId,
  currentAgentId,
  isOpen,
  onClose,
}: AgentAssignmentDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: agents, isLoading: isLoadingAgents } = useQuery<Agent[]>({
    queryKey: ['/api/v2/agents'],
    queryFn: async () => {
      const res = await fetch('/api/v2/agents');
      if (!res.ok) throw new Error('Failed to fetch agents');
      const data = await res.json();
      return data.data || [];
    },
    enabled: isOpen,
  });

  const assignMutation = useMutation({
    mutationFn: async (agentId: string | null) => {
      return apiRequest('PATCH', `/api/v2/properties/${propertyId}`, {
        listing_agent_id: agentId,
      });
    },
    onSuccess: () => {
      toast({ title: 'Agent assignment updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/v2/owned-properties'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v2/properties', propertyId] });
      onClose();
    },
    onError: (err: any) => {
      toast({
        title: 'Failed to update assignment',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  const filteredAgents = agents?.filter(agent => 
    agent.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign Listing Agent</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search agents..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
            {isLoadingAgents ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : filteredAgents?.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground p-4">No agents found</p>
            ) : (
              filteredAgents?.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={agent.profileImage} alt={agent.fullName} />
                      <AvatarFallback>{agent.fullName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-none truncate">{agent.fullName}</p>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{agent.email}</p>
                      <Badge variant="secondary" className="mt-1 text-[10px] h-4">
                        {agent.role.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={currentAgentId === agent.id ? "outline" : "default"}
                    disabled={assignMutation.isPending || currentAgentId === agent.id}
                    onClick={() => assignMutation.mutate(agent.id)}
                  >
                    {currentAgentId === agent.id ? "Assigned" : <UserPlus className="h-4 w-4" />}
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {currentAgentId && (
            <Button
              variant="destructive"
              className="w-full sm:w-auto"
              disabled={assignMutation.isPending}
              onClick={() => assignMutation.mutate(null)}
            >
              <UserMinus className="h-4 w-4 mr-2" />
              Remove Agent
            </Button>
          )}
          <Button variant="ghost" onClick={onClose} className="w-full sm:w-auto">Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
