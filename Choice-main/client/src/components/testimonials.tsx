import { Card } from '@/components/ui/card';
import { Star } from 'lucide-react';

const TESTIMONIALS = [
  {
    name: 'Sarah Johnson',
    role: 'First-Time Renter',
    location: 'New York, NY',
    content: 'Choice Properties made finding my first apartment so easy! The application process was straightforward and I got approved within 48 hours. Best experience ever!',
    rating: 5,
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop'
  },
  {
    name: 'Michael Chen',
    role: 'Home Buyer',
    location: 'San Francisco, CA',
    content: 'The mortgage calculator was incredibly helpful. I could see exactly what my payments would be and make an informed decision. Love the transparency!',
    rating: 5,
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop'
  },
  {
    name: 'Jennifer Martinez',
    role: 'Property Manager',
    location: 'Austin, TX',
    content: 'As a property manager with 3 listings, the platform has been a game-changer. Finding qualified renters has never been easier. Highly recommended!',
    rating: 5,
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop'
  },
  {
    name: 'David Thompson',
    role: 'Home Seller',
    location: 'Denver, CO',
    content: 'Sold my property within 3 weeks! The exposure through Choice Properties was amazing. Their agent network is top-notch.',
    rating: 5,
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop'
  }
];

export function Testimonials() {
  return (
    <section className="py-24 bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16" data-aos="fade-up">
          <h2 className="font-heading text-3xl md:text-5xl font-bold text-primary mb-6">
            What Our Users Say
          </h2>
          <p className="text-muted-foreground text-lg">
            Join thousands of satisfied renters, buyers, and sellers who've found their perfect home with Choice Properties.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {TESTIMONIALS.map((testimonial, idx) => (
            <Card
              key={idx}
              className="p-6 hover:shadow-lg transition-shadow border-l-4 border-l-secondary"
              data-aos="fade-up"
              data-aos-delay={idx * 100}
            >
              <div className="flex items-start gap-4">
                <img
                  src={testimonial.image}
                  alt={testimonial.name}
                  className="h-14 w-14 rounded-full object-cover flex-shrink-0"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1 mb-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="font-bold text-primary">{testimonial.name}</p>
                  <p className="text-xs text-gray-600">{testimonial.role}</p>
                  <p className="text-xs text-gray-500">{testimonial.location}</p>
                </div>
              </div>
              <p className="mt-4 text-gray-700 leading-relaxed">"{testimonial.content}"</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
