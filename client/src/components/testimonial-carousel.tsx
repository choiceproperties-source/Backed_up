import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Testimonial {
  name: string;
  location: string;
  image: string;
  rating: number;
  text: string;
  property: string;
}

interface TestimonialCarouselProps {
  testimonials: Testimonial[];
}

export function TestimonialCarousel({ testimonials }: TestimonialCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  useEffect(() => {
    if (!autoPlay) return;
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [autoPlay, testimonials.length]);

  const handlePrev = () => {
    setCurrent((prev) => (prev - 1 + testimonials.length) % testimonials.length);
    setAutoPlay(false);
  };

  const handleNext = () => {
    setCurrent((prev) => (prev + 1) % testimonials.length);
    setAutoPlay(false);
  };

  const visibleTestimonials = [
    testimonials[current],
    testimonials[(current + 1) % testimonials.length],
    testimonials[(current + 2) % testimonials.length],
  ];

  return (
    <div className="relative">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {visibleTestimonials.map((testimonial, idx) => (
          <div
            key={idx}
            className="bg-card border rounded-2xl p-8 shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            data-aos="fade-up"
            data-aos-delay={idx * 100}
          >
            <div className="flex items-center gap-4 mb-6">
              <img
                src={testimonial.image}
                alt={testimonial.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-secondary"
              />
              <div>
                <h4 className="font-bold text-lg text-primary">{testimonial.name}</h4>
                <p className="text-sm text-muted-foreground">{testimonial.location}</p>
              </div>
            </div>

            <div className="flex gap-1 mb-4">
              {[...Array(testimonial.rating)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              ))}
            </div>

            <p className="text-muted-foreground leading-relaxed mb-4 italic">
              "{testimonial.text}"
            </p>

            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Property: <span className="font-semibold text-primary">{testimonial.property}</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center items-center gap-4 mt-8">
        <Button
          size="icon"
          variant="outline"
          onClick={handlePrev}
          className="rounded-full"
          data-testid="button-testimonial-prev"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="flex gap-2">
          {testimonials.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCurrent(idx);
                setAutoPlay(false);
              }}
              className={`h-2 rounded-full transition-all ${
                idx === current ? 'bg-secondary w-8' : 'bg-border w-2'
              }`}
              data-testid={`button-testimonial-dot-${idx}`}
              aria-label={`Go to testimonial ${idx + 1}`}
            />
          ))}
        </div>

        <Button
          size="icon"
          variant="outline"
          onClick={handleNext}
          className="rounded-full"
          data-testid="button-testimonial-next"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
