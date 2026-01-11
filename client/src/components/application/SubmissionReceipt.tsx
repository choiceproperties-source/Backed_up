import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, MapPin, Calendar, Clock, Download, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SubmissionReceiptProps {
  property: any;
  applicantName: string;
  submissionDate: string;
  referenceId: string;
}

export function SubmissionReceipt({ property, applicantName, submissionDate, referenceId }: SubmissionReceiptProps) {
  const handleDownload = () => {
    window.open(`/api/v2/applications/${referenceId}/disclosures.pdf`, '_blank');
  };

  return (
    <Card className="bg-white dark:bg-gray-950 border-gray-100 dark:border-gray-800 rounded-none shadow-2xl overflow-hidden">
      <div className="bg-green-600 h-2 w-full" />
      <CardHeader className="text-center pt-10 pb-6">
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 bg-green-50 dark:bg-green-950/30 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <CardTitle className="text-3xl font-black tracking-tight">Application Received</CardTitle>
        <p className="text-muted-foreground">Reference ID: <span className="font-mono font-bold text-foreground">{referenceId}</span></p>
      </CardHeader>
      
      <CardContent className="px-10 pb-10 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-6 border-y border-gray-50 dark:border-gray-900">
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-primary">Property Information</h3>
            <div className="flex gap-4">
              <div className="h-16 w-24 bg-gray-100 dark:bg-gray-800 flex-shrink-0 overflow-hidden">
                {property?.images?.[0] && <img src={property.images[0]} alt="" className="w-full h-full object-cover" />}
              </div>
              <div>
                <p className="font-bold leading-tight">{property?.title}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" /> {property?.address}
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-primary">Submission Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Applicant:</span>
                <span className="font-bold">{applicantName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date:</span>
                <span className="font-bold">{submissionDate}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/20 p-6 space-y-3 border border-blue-100 dark:border-blue-900/50">
          <h4 className="text-sm font-black uppercase tracking-widest text-blue-900 dark:text-blue-300">Next Steps</h4>
          <ul className="space-y-3 text-sm text-blue-800 dark:text-blue-400">
            <li className="flex gap-3">
              <div className="h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">1</div>
              <p>Property Manager reviews your background, credit, and references.</p>
            </li>
            <li className="flex gap-3">
              <div className="h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">2</div>
              <p>You'll receive an email notification if additional info is needed.</p>
            </li>
            <li className="flex gap-3">
              <div className="h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">3</div>
              <p>Final decision typically reached within 3-5 business days.</p>
            </li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button 
            onClick={handleDownload}
            variant="outline" 
            className="flex-1 rounded-none h-12 font-black uppercase tracking-widest gap-2"
          >
            <Download className="h-4 w-4" /> Download Disclosures
          </Button>
          <Button className="flex-1 rounded-none h-12 font-black uppercase tracking-widest gap-2" asChild>
            <a href="/dashboard">
              Go to Dashboard <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
