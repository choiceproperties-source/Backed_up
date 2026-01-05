import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Maximize2, ImageOff, Trash2 } from "lucide-react";
import { getThumbnailUrl, getGalleryThumbUrl, getMainImageUrl, getFullscreenImageUrl } from "@/lib/imagekit";
import { getFallbackImageUrl } from "@/lib/gallery-placeholder";
import { useToast } from "@/hooks/use-toast";
import { OptimizedImage } from "@/components/optimized-image";
import { motion, AnimatePresence } from "framer-motion";

interface PhotoGalleryProps {
  images: string[];
  title: string;
  propertyId?: string;
  canEdit?: boolean;
  onImagesChange?: (images: string[]) => void;
  layout?: "grid" | "carousel";
}

export function PhotoGallery({ 
  images, 
  title, 
  propertyId, 
  canEdit = false, 
  onImagesChange,
  layout = "grid"
}: PhotoGalleryProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const { toast } = useToast();

  const validImages = useMemo(() => images.filter(img => img && typeof img === 'string'), [images]);
  const mainImage = validImages[currentImageIndex];

  useEffect(() => {
    if (!isFullscreen) {
      setControlsVisible(true);
      return;
    }

    let timeout: NodeJS.Timeout;
    const resetTimeout = () => {
      setControlsVisible(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setControlsVisible(false), 3000);
    };

    const handleMouseMove = () => resetTimeout();
    const handleTouch = () => resetTimeout();

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchstart", handleTouch);
    resetTimeout();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchstart", handleTouch);
      clearTimeout(timeout);
    };
  }, [isFullscreen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFullscreen) return;
      setControlsVisible(true);
      if (e.key === "Escape") setIsFullscreen(false);
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "ArrowRight") nextImage();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, validImages.length]);

  const handleDeleteImage = async (index: number) => {
    if (!propertyId || !canEdit) return;
    setIsDeleting(true);
    try {
      const newImages = validImages.filter((_, i) => i !== index);
      await fetch(`/api/properties/${propertyId}/photos`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: newImages })
      });
      onImagesChange?.(newImages);
      if (currentImageIndex >= newImages.length) {
        setCurrentImageIndex(Math.max(0, newImages.length - 1));
      }
      toast({ description: 'Photo deleted successfully' });
    } catch (err) {
      toast({ description: 'Failed to delete photo', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const nextImage = () => {
    if (validImages.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % validImages.length);
    }
  };

  const prevImage = () => {
    if (validImages.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
    }
  };

  if (validImages.length === 0) {
    return (
      <div className="w-full bg-background p-4">
        <div className="flex flex-col items-center justify-center min-h-[400px] rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30">
          <ImageOff className="h-16 w-16 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground">No images available</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {isFullscreen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Property Image Gallery"
          >
            <motion.div 
              animate={{ opacity: controlsVisible ? 1 : 0, y: controlsVisible ? 0 : -20 }}
              transition={{ duration: 0.2 }}
              className="flex justify-between items-center p-4 bg-black/40 z-20"
            >
              <span 
                className="text-white font-medium"
                aria-live="polite"
              >
                Image {currentImageIndex + 1} of {validImages.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 hover:scale-110 active:scale-95 transition-all"
                onClick={() => setIsFullscreen(false)}
                aria-label="Close fullscreen gallery"
              >
                <X className="h-6 w-6" />
              </Button>
            </motion.div>

            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
              <AnimatePresence>
                {controlsVisible && (
                  <>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 z-10 hidden md:flex"
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/20 hover:scale-110 active:scale-95 transition-all h-14 w-14 bg-black/20 backdrop-blur-sm rounded-full"
                        onClick={(e) => { e.stopPropagation(); prevImage(); }}
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="h-10 w-10" />
                      </Button>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 z-10 hidden md:flex"
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/20 hover:scale-110 active:scale-95 transition-all h-14 w-14 bg-black/20 backdrop-blur-sm rounded-full"
                        onClick={(e) => { e.stopPropagation(); nextImage(); }}
                        aria-label="Next image"
                      >
                        <ChevronRight className="h-10 w-10" />
                      </Button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              <motion.div
                key={currentImageIndex}
                initial={{ opacity: 0, x: 100 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="w-full h-full flex items-center justify-center p-4 cursor-pointer"
                onClick={() => setControlsVisible(prev => !prev)}
              >
                <OptimizedImage
                  src={getFullscreenImageUrl(mainImage)}
                  alt={`${title} - Image ${currentImageIndex + 1}`}
                  objectFit="contain"
                  className="max-h-full max-w-full select-none"
                />
              </motion.div>
            </div>

            <motion.div 
              animate={{ opacity: controlsVisible ? 1 : 0, y: controlsVisible ? 0 : 20 }}
              transition={{ duration: 0.2 }}
              ref={(el) => {
                if (el && isFullscreen) {
                  const activeThumb = el.children[currentImageIndex] as HTMLElement;
                  if (activeThumb) {
                    activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                  }
                }
              }}
              className="h-24 flex gap-2 px-4 py-3 overflow-x-auto bg-black/50 border-t border-white/10 scrollbar-hide"
            >
              {validImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(idx); }}
                  className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden transition-all hover:scale-105 active:scale-95 ${
                    idx === currentImageIndex ? "ring-2 ring-primary ring-offset-2" : "opacity-50 hover:opacity-100"
                  }`}
                  aria-label={`View image ${idx + 1}`}
                  aria-current={idx === currentImageIndex ? "true" : "false"}
                >
                  <OptimizedImage src={getThumbnailUrl(img)} alt={`Thumbnail ${idx + 1}`} className="w-full h-full" />
                </button>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full">
        {layout === "grid" ? (
          <div className="grid grid-cols-4 gap-2 rounded-xl overflow-hidden shadow-lg">
            <div 
              className="col-span-2 row-span-2 relative cursor-pointer group"
              onClick={() => { setCurrentImageIndex(0); setIsFullscreen(true); }}
            >
              <OptimizedImage 
                src={getGalleryThumbUrl(validImages[0])} 
                alt="Main" 
                className="w-full h-full aspect-square transition-transform duration-500 group-hover:scale-105" 
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            </div>
            {validImages.slice(1, 5).map((img, idx) => (
              <div 
                key={idx}
                className="relative cursor-pointer group"
                onClick={() => { setCurrentImageIndex(idx + 1); setIsFullscreen(true); }}
              >
                <OptimizedImage 
                  src={getGalleryThumbUrl(img)} 
                  alt={`View ${idx + 2}`} 
                  className="w-full h-full aspect-video md:aspect-square object-cover" 
                />
                {idx === 3 && validImages.length > 5 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold">
                    +{validImages.length - 5}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="relative group overflow-hidden rounded-xl">
            <div className="aspect-video relative">
              <OptimizedImage src={getMainImageUrl(mainImage)} alt={title} className="w-full h-full" />
              <div className="absolute inset-0 flex items-center justify-between px-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="bg-white/20 text-white" onClick={prevImage}><ChevronLeft /></Button>
                <Button variant="ghost" size="icon" className="bg-white/20 text-white" onClick={nextImage}><ChevronRight /></Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}