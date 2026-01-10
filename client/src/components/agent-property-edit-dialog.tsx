import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, CheckCircle2 } from 'lucide-react';

interface AgentPropertyEditDialogProps {
  property: any;
  isOpen: boolean;
  onClose: () => void;
}

export function AgentPropertyEditDialog({
  property,
  isOpen,
  onClose,
}: AgentPropertyEditDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    title: property?.title || '',
    description: property?.description || '',
    price: property?.price || 0,
    bedrooms: property?.bedrooms || 0,
    bathrooms: property?.bathrooms || 0,
    squareFeet: property?.squareFeet || 0,
    applicationFee: property?.applicationFee || 45,
    availableFrom: property?.availableFrom || '',
  });

  useEffect(() => {
    if (property) {
      setFormData({
        title: property.title || '',
        description: property.description || '',
        price: property.price || 0,
        bedrooms: property.bedrooms || 0,
        bathrooms: property.bathrooms || 0,
        squareFeet: property.squareFeet || 0,
        applicationFee: property.applicationFee || 45,
        availableFrom: property.availableFrom || '',
      });
    }
  }, [property]);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedData, setLastSavedData] = useState<any>(null);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      setSaveStatus('saving');
      const allowedData = {
        title: data.title,
        description: data.description,
        price: data.price,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        squareFeet: data.squareFeet,
        applicationFee: data.applicationFee,
        availableFrom: data.availableFrom,
      };
      return apiRequest('PATCH', `/api/v2/properties/${property.id}`, allowedData);
    },
    onSuccess: (data) => {
      setSaveStatus('saved');
      setLastSavedData(formData);
      queryClient.invalidateQueries({ queryKey: ['/api/v2/properties'] });
      queryClient.invalidateQueries({ queryKey: ['/api/v2/owned-properties'] });
      setTimeout(() => setSaveStatus('idle'), 3000);
    },
    onError: (err: any) => {
      setSaveStatus('error');
      toast({
        title: 'Failed to update property',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      if (JSON.stringify(formData) !== JSON.stringify(lastSavedData) && lastSavedData !== null) {
        updateMutation.mutate(formData);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [formData, lastSavedData]);

  useEffect(() => {
    if (property && lastSavedData === null) {
      setLastSavedData({
        title: property.title || '',
        description: property.description || '',
        price: property.price || 0,
        bedrooms: property.bedrooms || 0,
        bathrooms: property.bathrooms || 0,
        squareFeet: property.squareFeet || 0,
        applicationFee: property.applicationFee || 45,
        availableFrom: property.availableFrom || '',
      });
    }
  }, [property]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Edit Assigned Property</DialogTitle>
            <div className="text-sm font-medium">
              {saveStatus === 'saving' && <span className="text-blue-500 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Saving...</span>}
              {saveStatus === 'saved' && <span className="text-green-500 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> All changes saved</span>}
              {saveStatus === 'error' && <span className="text-red-500">Failed to save</span>}
            </div>
          </div>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Monthly Price ($)</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="applicationFee">Application Fee ($)</Label>
              <Input
                id="applicationFee"
                type="number"
                value={formData.applicationFee}
                onChange={(e) => setFormData({ ...formData, applicationFee: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bedrooms">Bedrooms</Label>
              <Input
                id="bedrooms"
                type="number"
                value={formData.bedrooms}
                onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bathrooms">Bathrooms</Label>
              <Input
                id="bathrooms"
                type="number"
                step="0.5"
                value={formData.bathrooms}
                onChange={(e) => setFormData({ ...formData, bathrooms: parseFloat(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="squareFeet">Sq Ft</Label>
              <Input
                id="squareFeet"
                type="number"
                value={formData.squareFeet}
                onChange={(e) => setFormData({ ...formData, squareFeet: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="availableFrom">Available From</Label>
            <Input
              id="availableFrom"
              type="date"
              value={formData.availableFrom}
              onChange={(e) => setFormData({ ...formData, availableFrom: e.target.value })}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
