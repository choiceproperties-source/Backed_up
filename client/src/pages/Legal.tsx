import { legalDocuments } from "@/data/legalDocuments";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Clock, FileText, Info, Globe, Users, AlertTriangle } from "lucide-react";
import { Footer } from "@/components/layout/footer";
import { Badge } from "@/components/ui/badge";

export default function Legal() {
  const categories = Array.from(new Set(legalDocuments.map(doc => doc.category)));

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <div className="space-y-4 mb-8 text-center">
          <div className="inline-flex items-center justify-center p-2 bg-primary/10 rounded-full mb-2">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-4xl font-black tracking-tight uppercase">Legal & Disclosures</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            These documents govern your use of Choice Properties and tenant applications. 
          </p>
        </div>

        <Card className="mb-12 border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 rounded-none shadow-none">
          <CardHeader className="flex flex-row items-start gap-4 space-y-0 p-6">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-1 shrink-0" />
            <div className="space-y-1">
              <CardTitle className="text-sm font-black uppercase tracking-wider text-amber-900 dark:text-amber-400">Important Notice</CardTitle>
              <CardDescription className="text-sm text-amber-800 dark:text-amber-500 font-medium">
                These legal documents may change over time. Please review the most recent version before submitting any application.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        <Card className="mb-12 border-primary/20 bg-primary/5 rounded-none shadow-none">
          <CardHeader className="flex flex-row items-start gap-4 space-y-0">
            <Info className="h-5 w-5 text-primary mt-1 shrink-0" />
            <div className="space-y-1">
              <CardTitle className="text-sm font-bold uppercase tracking-wider">Compliance Registry</CardTitle>
              <CardDescription className="text-sm">
                Official repository for Choice Properties regulatory disclosures and user agreements.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        <div className="space-y-12">
          {categories.map((category) => (
            <section key={category} className="space-y-6">
              <div className="flex items-center gap-4">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-primary">{category}</h2>
                <div className="h-px flex-1 bg-border" />
              </div>

              <Accordion type="single" collapsible className="w-full space-y-4">
                {legalDocuments
                  .filter((doc) => doc.category === category)
                  .map((doc) => (
                    <AccordionItem 
                      key={doc.id} 
                      value={doc.id} 
                      className="border rounded-none px-6 bg-card hover-elevate transition-all duration-200 shadow-sm overflow-visible"
                    >
                      <AccordionTrigger className="hover:no-underline py-6">
                        <div className="flex flex-col items-start text-left space-y-2 w-full pr-4">
                          <div className="flex items-center justify-between w-full">
                            <span className="text-lg font-bold tracking-tight">{doc.title}</span>
                            <Badge variant="outline" className="text-[10px] font-black uppercase rounded-none border-primary/30">
                              v{doc.version}
                            </Badge>
                          </div>
                          <span className="text-sm text-muted-foreground font-medium">{doc.summary}</span>
                          <div className="flex flex-wrap gap-3 pt-1">
                             <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                <Globe className="h-3 w-3" />
                                {doc.jurisdiction}
                             </div>
                             <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                <Users className="h-3 w-3" />
                                {doc.appliesTo}
                             </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-8 pt-2">
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 border border-border">
                             <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter">Effective Date</p>
                                <p className="text-xs font-bold">{new Date(doc.effectiveDate).toLocaleDateString()}</p>
                             </div>
                             <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter">Document Key</p>
                                <p className="text-xs font-mono font-bold text-primary">{doc.documentKey}</p>
                             </div>
                          </div>
                          
                          <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap font-medium">
                            {doc.content}
                          </div>

                          <div className="pt-6 border-t flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-2 text-xs text-primary font-bold">
                              <FileText className="h-4 w-4" />
                              Official Document ID: CP-{doc.id.toUpperCase()}-2026
                            </div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                              &copy; 2026 Choice Properties &bull; {doc.jurisdiction} Regulatory Compliance
                            </p>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
              </Accordion>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
