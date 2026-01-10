import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { UserPlus, Loader2, Check } from 'lucide-react';

interface AssignAgentDropdownProps {
  propertyId: string;
  currentAgentId?: string | null;
}

export function AssignAgentDropdown({ propertyId, currentAgentId }: AssignAgentDropdownProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const { data: agents, isLoading } = useQuery<any[]>({
    queryKey: ['/api/v2/agents'],
    enabled: isOpen,
    queryFn: async () => {
      const res = await fetch('/api/v2/users?role=agent');
      const json = await res.json();
      return json.data || [];
    }
  });

  const assignMutation = useMutation({
    mutationFn: async (agentId: string | null) => {
      return apiRequest('PATCH', `/api/v2/properties/${propertyId}/assign-agent`, {
        listing_agent_id: agentId
      });
    },
    onSuccess: () => {
      toast({ title: 'Agent assignment updated' });
      queryClient.invalidateQueries({ queryKey: ['/api/v2/properties'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v2/owned-properties'] });
      setIsOpen(false);
    },
    onError: (err: any) => {
      toast({
        title: 'Failed to assign agent',
        description: err.message,
        variant: 'destructive',
      });
    }
  });

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <UserPlus className="h-4 w-4" />
          {currentAgentId ? 'Change Agent' : 'Assign Agent'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Select Listing Agent</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : (
          <>
            <DropdownMenuItem 
              className="flex items-center justify-between"
              onClick={() => assignMutation.mutate(null)}
            >
              None (Unassign)
              {!currentAgentId && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
            {agents?.map((agent) => (
              <DropdownMenuItem
                key={agent.id}
                className="flex items-center justify-between"
                onClick={() => assignMutation.mutate(agent.id)}
              >
                <div className="flex flex-col">
                  <span>{agent.full_name}</span>
                  <span className="text-xs text-muted-foreground">{agent.email}</span>
                </div>
                {currentAgentId === agent.id && <Check className="h-4 w-4" />}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
