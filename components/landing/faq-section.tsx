"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

const faqs = [
  {
    q: "How can I place an order?",
    a: "You can easily place your order through our website by selecting your desired product or service and following the checkout process. If you need help, our customer support team is ready to assist.",
  },
  {
    q: "How long does delivery take?",
    a: "You can easily place your order through our website by selecting your desired product or service and following the checkout process. If you need help, our customer support team is ready to assist.",
  },
  {
    q: "Can I change or cancel my order after placing it?",
    a: "You can easily place your order through our website by selecting your desired product or service and following the checkout process. If you need help, our customer support team is ready to assist.",
  },
  {
    q: "What payment methods do you accept?",
    a: "You can easily place your order through our website by selecting your desired product or service and following the checkout process. If you need help, our customer support team is ready to assist.",
  },
];

export function FAQSection() {
  return (
    <section
      id="faq"
      className="bg-muted font-body px-6 py-16 md:py-24"
    >
      <div className="container mx-auto grid max-w-6xl gap-12 md:grid-cols-2">
        <div>
          <h2 className="font-section text-3xl font-bold text-primary md:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-muted-foreground">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse
            varius enim in eros elementum tristique. Duis cursus, mi quis
            viverra ornare, eros dolor interdum nulla, ut commodo diam libero
            vitae erat.
          </p>
        </div>
        <div>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={faq.q}
                value={`item-${i}`}
                className={cn(
                  "border-b border-border py-4 last:border-b-0",
                  "data-[state=open]> [data-slot=accordion-trigger]:border-0"
                )}
              >
                <AccordionTrigger className="font-section py-4 text-left font-medium text-foreground hover:no-underline [&>svg]:text-muted-foreground">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
