import { legalDocuments } from "@/data/legalDocuments";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Clock, FileText, Info } from "lucide-react";
import { Footer } from "@/components/layout/footer";

export default function Legal() {
  const categories = Array.from(new Set(legalDocuments.map(doc => doc.category)));

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 container mx-auto px-4 py-12 max-w-4xl">
        <div className="space-y-4 mb-12 text-center">
          <div className="inline-flex items-center justify-center p-2 bg-primary/10 rounded-full mb-2">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-4xl font-black tracking-tight uppercase">Legal & Disclosures</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            These documents govern your use of Choice Properties and tenant applications. 
            We are committed to transparency, compliance, and protecting your rights.
          </p>
        </div>

        <Card className="mb-12 border-primary/20 bg-primary/5 rounded-none shadow-none">
          <CardHeader className="flex flex-row items-start gap-4 space-y-0">
            <Info className="h-5 w-5 text-primary mt-1 shrink-0" />
            <div className="space-y-1">
              <CardTitle className="text-sm font-bold uppercase tracking-wider">Compliance Notice</CardTitle>
              <CardDescription className="text-sm">
                Last reviewed: January 12, 2026. These documents are updated periodically to remain compliant with changing laws and regulations.
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
                        <div className="flex flex-col items-start text-left space-y-1">
                          <span className="text-lg font-bold tracking-tight">{doc.title}</span>
                          <span className="text-sm text-muted-foreground font-medium">{doc.summary}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-8 pt-2">
                        <div className="space-y-6">
                          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted/50 p-2 inline-flex">
                            <Clock className="h-3 w-3" />
                            Last Updated: {doc.lastUpdated}
                          </div>
                          <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap">
                            {doc.content}
                          </div>
                          <div className="pt-6 border-t flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-primary font-bold">
                              <FileText className="h-4 w-4" />
                              Official Document ID: CP-{doc.id.toUpperCase()}-2026
                            </div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                              &copy; 2026 Choice Properties
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
