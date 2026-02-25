import "./landing.css";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LandingHeader } from "@/components/landing/landing-header";
import { HeroSection } from "@/components/landing/hero-section";
import { WhoWeHelpSection } from "@/components/landing/who-we-help-section";
import { ServicesSection } from "@/components/landing/services-section";
import { WhyItWorksSection } from "@/components/landing/why-it-works-section";
import { TestimonialsSection } from "@/components/landing/testimonials-section";
import { BlogSection } from "@/components/landing/blog-section";
import { FAQSection } from "@/components/landing/faq-section";
import { CTASection } from "@/components/landing/cta-section";
import { LandingFooter } from "@/components/landing/landing-footer";

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <div className="hously-landing min-h-screen bg-muted">
      <LandingHeader />
      <main>
        <HeroSection />
        <WhoWeHelpSection />
        <ServicesSection />
        <WhyItWorksSection />
        <TestimonialsSection />
        <BlogSection />
        <FAQSection />
        <CTASection />
        <LandingFooter />
      </main>
    </div>
  );
}
