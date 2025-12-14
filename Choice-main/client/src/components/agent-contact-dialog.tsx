import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Mail } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface AgentContactDialogProps {
  agent: Agent;
  propertyId?: string;
  propertyTitle?: string;
  triggerText?: string;
}

export function AgentContactDialog({
  agent,
  propertyId,
  propertyTitle,
  triggerText = 'Contact Agent'
}: AgentContactDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email || !phone || !message) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);

    // Save to localStorage
    const inquiries = JSON.parse(localStorage.getItem('choiceProperties_inquiries') || '[]');
    inquiries.push({
      id: `inquiry_${Date.now()}`,
      agentId: agent.id,
      agentName: agent.name,
      agentEmail: agent.email,
      propertyId: propertyId || null,
      propertyTitle: propertyTitle || null,
      senderName: name,
      senderEmail: email,
      senderPhone: phone,
      message,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    localStorage.setItem('choiceProperties_inquiries', JSON.stringify(inquiries));

    setTimeout(() => {
      setLoading(false);
      toast.success(`Message sent to ${agent.name}!`);
      setOpen(false);
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-primary hover:bg-primary/90 font-semibold">
          <Mail className="h-4 w-4 mr-2" />
          {triggerText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Contact {agent.name}</DialogTitle>
          <DialogDescription>
            Send a message to discuss {propertyTitle ? `${propertyTitle} or ` : ''}your real estate needs
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Your Name</label>
            <Input
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Your Email</label>
            <Input
              type="email"
              placeholder="john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Your Phone</label>
            <Input
              type="tel"
              placeholder="(555) 123-4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Message</label>
            <Textarea
              placeholder="Tell us what you're looking for..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={loading}
              className="min-h-[100px]"
            />
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {loading ? 'Sending...' : 'Send Message'}
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            {agent.name} will receive your message and contact you shortly
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
