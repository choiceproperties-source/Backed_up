import { useState } from "react";
import { format, addDays, startOfWeek, isSameDay, isAfter, isBefore, startOfDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar, Clock, Video, MapPin, ChevronLeft, ChevronRight, Check, User, Mail, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ScheduleTourCalendarProps {
  propertyId: string;
  propertyTitle: string;
  propertyAddress: string;
  onSchedule?: (data: TourScheduleData) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface TourScheduleData {
  date: Date;
  time: string;
  tourType: "in-person" | "video";
  name: string;
  email: string;
  phone: string;
  message?: string;
}

const timeSlots = [
  "9:00 AM", "10:00 AM", "11:00 AM", 
  "12:00 PM", "1:00 PM", "2:00 PM", 
  "3:00 PM", "4:00 PM", "5:00 PM"
];

export function ScheduleTourCalendar({
  propertyId,
  propertyTitle,
  propertyAddress,
  onSchedule,
  open = false,
  onOpenChange,
}: ScheduleTourCalendarProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [tourType, setTourType] = useState<"in-person" | "video">("in-person");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const today = startOfDay(new Date());
  const weekStart = addDays(startOfWeek(today, { weekStartsOn: 0 }), weekOffset * 7);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const handleDateSelect = (date: Date) => {
    if (isBefore(date, today)) return;
    setSelectedDate(date);
    setSelectedTime(null);
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) return;
    
    setIsSubmitting(true);
    
    const scheduleData: TourScheduleData = {
      date: selectedDate,
      time: selectedTime,
      tourType,
      ...formData,
    };

    try {
      if (onSchedule) {
        await onSchedule(scheduleData);
      }
      
      toast({
        title: "Tour Scheduled!",
        description: `Your ${tourType} tour is confirmed for ${format(selectedDate, "MMMM d")} at ${selectedTime}.`,
      });

      setStep(4);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to schedule tour. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSelectedDate(null);
    setSelectedTime(null);
    setFormData({ name: "", email: "", phone: "", message: "" });
  };

  const handleClose = () => {
    resetForm();
    onOpenChange?.(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleClose();
      else onOpenChange?.(isOpen);
    }}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-primary/10 to-primary/5">
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Schedule a Tour
          </DialogTitle>
          <DialogDescription className="text-sm">
            {propertyTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-2">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= s 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {step > s ? <Check className="h-4 w-4" /> : s}
                </div>
                {s < 3 && (
                  <div className={`w-16 h-0.5 mx-2 ${step > s ? 'bg-primary' : 'bg-muted'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 pb-6">
          {step === 1 && (
            <div className="space-y-4" data-testid="tour-step-1">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
                  disabled={weekOffset === 0}
                  data-testid="button-prev-week"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium">
                  {format(weekDays[0], "MMM d")} - {format(weekDays[6], "MMM d, yyyy")}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setWeekOffset(weekOffset + 1)}
                  disabled={weekOffset >= 3}
                  data-testid="button-next-week"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day) => {
                  const isPast = isBefore(day, today);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isToday = isSameDay(day, today);
                  
                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => handleDateSelect(day)}
                      disabled={isPast}
                      className={`p-2 rounded-lg text-center transition-all ${
                        isPast 
                          ? 'opacity-40 cursor-not-allowed' 
                          : isSelected 
                            ? 'bg-primary text-primary-foreground' 
                            : 'hover:bg-muted'
                      } ${isToday && !isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                      data-testid={`date-${format(day, "yyyy-MM-dd")}`}
                    >
                      <div className="text-xs text-muted-foreground mb-1">
                        {format(day, "EEE")}
                      </div>
                      <div className="text-lg font-medium">
                        {format(day, "d")}
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedDate && (
                <div className="space-y-2 pt-4 border-t">
                  <p className="text-sm font-medium">Available times for {format(selectedDate, "EEEE, MMMM d")}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {timeSlots.map((time) => (
                      <Button
                        key={time}
                        variant={selectedTime === time ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedTime(time)}
                        data-testid={`time-${time.replace(/\s/g, "-")}`}
                      >
                        {time}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <Button
                className="w-full"
                disabled={!selectedDate || !selectedTime}
                onClick={() => setStep(2)}
                data-testid="button-continue-step-1"
              >
                Continue
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4" data-testid="tour-step-2">
              <div className="p-3 bg-muted rounded-lg flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">{selectedDate && format(selectedDate, "EEEE, MMMM d")}</p>
                  <p className="text-sm text-muted-foreground">{selectedTime}</p>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Tour Type</Label>
                <RadioGroup
                  value={tourType}
                  onValueChange={(value) => setTourType(value as "in-person" | "video")}
                  className="grid grid-cols-2 gap-3"
                >
                  <div>
                    <RadioGroupItem
                      value="in-person"
                      id="in-person"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="in-person"
                      className="flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                    >
                      <MapPin className="h-6 w-6 mb-2" />
                      <span className="font-medium">In-Person</span>
                      <span className="text-xs text-muted-foreground">Visit the property</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem
                      value="video"
                      id="video"
                      className="peer sr-only"
                    />
                    <Label
                      htmlFor="video"
                      className="flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                    >
                      <Video className="h-6 w-6 mb-2" />
                      <span className="font-medium">Video Tour</span>
                      <span className="text-xs text-muted-foreground">Live video call</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button onClick={() => setStep(3)} className="flex-1" data-testid="button-continue-step-2">
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4" data-testid="tour-step-3">
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {tourType === "in-person" ? (
                    <MapPin className="h-4 w-4 text-primary" />
                  ) : (
                    <Video className="h-4 w-4 text-primary" />
                  )}
                  <span className="font-medium capitalize">{tourType} Tour</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedDate && format(selectedDate, "EEEE, MMMM d")} at {selectedTime}
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="pl-10"
                      data-testid="input-name"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="pl-10"
                      data-testid="input-email"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="pl-10"
                      data-testid="input-phone"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="message">Message (Optional)</Label>
                  <Textarea
                    id="message"
                    placeholder="Any questions or special requests?"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={3}
                    data-testid="input-message"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  Back
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  className="flex-1"
                  disabled={!formData.name || !formData.email || !formData.phone || isSubmitting}
                  data-testid="button-confirm-tour"
                >
                  {isSubmitting ? "Scheduling..." : "Confirm Tour"}
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center space-y-4 py-6" data-testid="tour-step-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1">Tour Scheduled!</h3>
                <p className="text-muted-foreground">
                  Your {tourType} tour is confirmed for
                </p>
                <p className="font-medium text-lg">
                  {selectedDate && format(selectedDate, "EEEE, MMMM d")} at {selectedTime}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                A confirmation email has been sent to {formData.email}
              </p>
              <Button onClick={handleClose} className="w-full" data-testid="button-done">
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
