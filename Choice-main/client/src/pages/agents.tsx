import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, MapPin, Star, Shield, Loader2, Building2, Users } from 'lucide-react';
import { AgentContactDialog } from '@/components/agent-contact-dialog';
import { updateMetaTags } from "@/lib/seo";

interface Agent {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  profile_image: string;
  bio: string;
  license_number: string;
  license_state: string;
  license_expiry: string;
  license_verified: boolean;
  specialties: string[];
  years_experience: number;
  total_sales: number;
  rating: string;
  review_count: number;
  location: string;
  agency: {
    id: string;
    name: string;
    logo: string;
  } | null;
}

export default function Agents() {
  useEffect(() => {
    updateMetaTags({
      title: "Find an Agent - Choice Properties",
      description: "Browse trusted real estate agents in your area. Find experienced professionals to help you buy, sell, or rent property.",
      image: "https://choiceproperties.com/og-image.png",
      url: "https://choiceproperties.com/agents"
    });
  }, []);

  const [search, setSearch] = useState('');
  const [specialty, setSpecialty] = useState('all');

  const { data: agentsResponse, isLoading } = useQuery({
    queryKey: ['/api/agents', { search, specialty }],
  });

  const agents: Agent[] = (agentsResponse as any)?.data || [];

  const specialties = useMemo(() => {
    const specs = new Set<string>();
    agents.forEach(a => a.specialties?.forEach((s: string) => specs.add(s)));
    return Array.from(specs);
  }, [agents]);

  const filtered = useMemo(() => {
    let result = agents;
    if (search) {
      result = result.filter(a =>
        a.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        a.location?.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (specialty !== 'all') {
      result = result.filter(a => a.specialties?.includes(specialty));
    }
    return result.sort((a, b) => parseFloat(b.rating || '0') - parseFloat(a.rating || '0'));
  }, [agents, search, specialty]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <div className="bg-gradient-to-r from-primary to-secondary text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">Find an Agent</h1>
          <p className="text-white/90">Browse trusted agents in your area</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-20">
              <h3 className="font-bold text-lg mb-6">Filters</h3>

              <div className="space-y-4">
                <div>
                  <label className="font-semibold text-sm mb-2 block">Search</label>
                  <Input
                    placeholder="Name or location..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    data-testid="input-search-agents"
                  />
                </div>

                <div>
                  <label className="font-semibold text-sm mb-2 block text-foreground">Specialty</label>
                  <select
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="w-full px-3 py-2 border rounded bg-background dark:bg-gray-900 border-border text-foreground"
                    data-testid="select-specialty"
                  >
                    <option value="all">All Specialties</option>
                    {specialties.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <Card className="p-12 text-center">
                <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">No Agents Found</h3>
                <p className="text-muted-foreground">
                  {search || specialty !== 'all' 
                    ? 'Try adjusting your search criteria' 
                    : 'No agents are currently available'}
                </p>
              </Card>
            ) : (
              <>
                <p className="text-muted-foreground mb-6" data-testid="text-agent-count">
                  {filtered.length} agent{filtered.length !== 1 ? 's' : ''} found
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filtered.map(agent => (
                    <Card 
                      key={agent.id} 
                      className="p-6 hover:shadow-lg transition-shadow"
                      data-testid={`card-agent-${agent.id}`}
                    >
                      <div className="flex gap-4 mb-4">
                        <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          {agent.profile_image ? (
                            <img
                              src={agent.profile_image}
                              alt={agent.full_name}
                              className="h-20 w-20 rounded-full object-cover"
                            />
                          ) : (
                            <Users className="h-10 w-10 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-bold text-lg truncate">{agent.full_name}</h3>
                            {agent.license_verified && (
                              <Shield className="h-4 w-4 text-green-600 flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-yellow-500 mb-2">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`h-4 w-4 ${i < Math.round(parseFloat(agent.rating || '0')) ? 'fill-yellow-400' : ''}`} 
                              />
                            ))}
                            <span className="text-xs text-muted-foreground">
                              ({parseFloat(agent.rating || '0').toFixed(1)})
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {agent.total_sales} sales
                            {agent.years_experience ? ` | ${agent.years_experience} years exp.` : ''}
                          </p>
                        </div>
                      </div>

                      {agent.bio && (
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {agent.bio}
                        </p>
                      )}

                      <div className="space-y-2 mb-4 text-sm">
                        {agent.location && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4 flex-shrink-0" /> 
                            <span className="truncate">{agent.location}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4 flex-shrink-0" /> 
                          <span className="truncate">{agent.email}</span>
                        </div>
                        {agent.phone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-4 w-4 flex-shrink-0" /> 
                            <span>{agent.phone}</span>
                          </div>
                        )}
                        {agent.agency && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Building2 className="h-4 w-4 flex-shrink-0" /> 
                            <span className="truncate">{agent.agency.name}</span>
                          </div>
                        )}
                      </div>

                      {agent.specialties && agent.specialties.length > 0 && (
                        <div className="flex gap-2 mb-4 flex-wrap">
                          {agent.specialties.slice(0, 3).map((s: string) => (
                            <Badge key={s} variant="secondary" className="text-xs">
                              {s}
                            </Badge>
                          ))}
                          {agent.specialties.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{agent.specialties.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}

                      <AgentContactDialog agent={{
                        id: agent.id,
                        name: agent.full_name,
                        email: agent.email,
                        phone: agent.phone || '',
                      }} />
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
