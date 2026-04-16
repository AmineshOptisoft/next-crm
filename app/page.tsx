import Link from "next/link";
import Image from "next/image";
import {
  ArrowRightIcon,
  CreditCardIcon,
  StarIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BentoCard, BentoGrid, CARDS } from "@/components/ui/bento-grid";
import { BorderBeam } from "@/components/ui/border-beam";
import { LampContainer } from "@/components/ui/lamp";
import MagicBadge from "@/components/ui/magic-badge";
import MagicCard from "@/components/ui/magic-card";
import AnimationContainer from "@/components/landing/animation-container";
import MaxWidthWrapper from "@/components/landing/max-width-wrapper";
import PricingCards from "@/components/landing/pricing-cards";
import LandingNavbar from "@/components/landing/navbar";
import LandingFooter from "@/components/landing/footer";
import { COMPANIES, PROCESS, REVIEWS } from "@/lib/landing-content";

export default function HomePage() {
  return (
    <div className="overflow-x-hidden size-full relative">
      <div
        id="home"
        className="absolute inset-0 dark:bg-[linear-gradient(to_right,#161616_1px,transparent_1px),linear-gradient(to_bottom,#161616_1px,transparent_1px)] bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-full pointer-events-none"
      />
      <LandingNavbar />
      <main className="mt-20 mx-auto w-full z-0 relative">
      <MaxWidthWrapper>
        <div className="flex flex-col items-center justify-center w-full text-center bg-gradient-to-t from-background">
          <AnimationContainer className="flex flex-col items-center justify-center w-full text-center">
            <button className="group relative grid overflow-hidden rounded-full px-4 py-1 shadow-[0_1000px_0_0_hsl(0_0%_20%)_inset] transition-colors duration-200">
              <span>
                <span className="spark mask-gradient absolute inset-0 h-[100%] w-[100%] animate-flip overflow-hidden rounded-full [mask:linear-gradient(white,_transparent_50%)] before:absolute before:aspect-square before:w-[200%] before:rotate-[-90deg] before:animate-rotate before:bg-[conic-gradient(from_0deg,transparent_0_340deg,white_360deg)] before:content-[''] before:[inset:0_auto_auto_50%] before:[translate:-50%_-15%]" />
              </span>
              <span className="backdrop absolute inset-[1px] rounded-full bg-neutral-950 transition-colors duration-200 group-hover:bg-neutral-900" />
              <span className="h-full w-full blur-md absolute bottom-0 inset-x-0 bg-gradient-to-tr from-primary/20" />
              <span className="z-10 py-0.5 text-sm text-neutral-100 flex items-center justify-center gap-1">
                ✨ Cleaner booking, simplified
                <ArrowRightIcon className="ml-1 size-3 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5" />
              </span>
            </button>
            <h1 className="text-foreground text-center py-6 text-5xl font-medium tracking-normal text-balance sm:text-6xl md:text-7xl lg:text-8xl !leading-[1.15] w-full">
              Book More Cleans with{" "}
              <span className="text-transparent bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text inline-block">
                Confidence
              </span>
            </h1>
            <p className="mb-12 text-lg tracking-tight text-muted-foreground md:text-xl text-balance">
              Run your cleaning business from one booking-first workspace.
              <br className="hidden md:block" />
              <span className="hidden md:block">
                Capture appointments, assign teams, and keep customers updated automatically.
              </span>
            </p>
            <div className="flex items-center justify-center whitespace-nowrap gap-4 z-50">
              <Button asChild>
                <Link href="/dashboard" className="flex items-center">
                  Start booking for free
                  <ArrowRightIcon className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>
          </AnimationContainer>

          <AnimationContainer
            delay={0.2}
            className="relative pt-20 pb-20 md:py-32 px-2 bg-transparent w-full"
          >
            <div className="absolute md:top-[10%] left-1/2 gradient w-3/4 -translate-x-1/2 h-1/4 md:h-1/3 inset-0 blur-[5rem] animate-image-glow" />
            <div className="-m-2 relative overflow-hidden rounded-xl p-2 ring-1 ring-inset ring-foreground/20 lg:-m-4 lg:rounded-2xl bg-opacity-50 backdrop-blur-3xl">
              <BorderBeam size={250} duration={12} delay={9} />
              <Image
                src="/assets/dashboard-dark.png"
                alt="Dashboard"
                width={1200}
                height={1200}
                quality={100}
                className="rounded-md lg:rounded-xl bg-foreground/10 ring-1 ring-border"
                priority
              />
              <div className="absolute -bottom-4 inset-x-0 w-full h-1/2 bg-gradient-to-t from-background z-40" />
              <div className="absolute bottom-0 md:-bottom-8 inset-x-0 w-full h-1/4 bg-gradient-to-t from-background z-50" />
            </div>
          </AnimationContainer>
        </div>
      </MaxWidthWrapper>

      <MaxWidthWrapper>
        <AnimationContainer delay={0.4}>
          <div className="py-14">
            <div className="mx-auto px-4 md:px-8">
              <h2 className="text-center text-sm font-medium text-neutral-400 uppercase">
                Trusted by growing cleaning teams
              </h2>
              <div className="mt-8">
                <ul className="flex flex-wrap items-center gap-x-6 gap-y-6 md:gap-x-16 justify-center">
                  {COMPANIES.map((company) => (
                    <li key={company.name}>
                      <Image
                        src={company.logo}
                        alt={company.name}
                        width={80}
                        height={80}
                        quality={100}
                        className="w-28 h-auto"
                      />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </AnimationContainer>
      </MaxWidthWrapper>

      <MaxWidthWrapper className="pt-10" id="features">
        <AnimationContainer delay={0.1}>
          <div className="flex flex-col w-full items-center justify-center py-8">
            <MagicBadge title="Features" />
            <h2 className="text-center text-3xl md:text-5xl !leading-[1.1] font-medium text-foreground mt-6">
              Run Operations Like a Pro
            </h2>
            <p className="mt-4 text-center text-lg text-muted-foreground max-w-lg">
              CleanFlow helps you manage bookings, crews, and customer communication in one place.
            </p>
          </div>
        </AnimationContainer>
        <AnimationContainer delay={0.2}>
          <BentoGrid className="py-8">
            {CARDS.map((feature) => (
              <BentoCard
                key={feature.name}
                name={feature.name}
                className={feature.className}
                background={feature.background}
                icon={feature.icon}
                description={feature.description}
                href={feature.href}
                cta={feature.cta}
              />
            ))}
          </BentoGrid>
        </AnimationContainer>
      </MaxWidthWrapper>

      <MaxWidthWrapper className="py-10" id="pricing">
        <div id="testimonials" />
        <AnimationContainer delay={0.1}>
          <div className="flex flex-col items-center justify-center w-full py-8 max-w-xl mx-auto">
            <MagicBadge title="The Process" />
            <h2 className="text-center text-3xl md:text-5xl !leading-[1.1] font-medium text-foreground mt-6">
              Effortless cleaner booking in 3 steps
            </h2>
            <p className="mt-4 text-center text-lg text-muted-foreground max-w-lg">
              Follow these simple steps to launch and grow your cleaning business online.
            </p>
          </div>
        </AnimationContainer>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 w-full py-8 gap-4 md:gap-8">
          {PROCESS.map((process, id) => (
            <AnimationContainer delay={0.2 * id} key={process.title}>
              <MagicCard className="group md:py-8">
                <div className="flex flex-col items-start justify-center w-full">
                  <process.icon strokeWidth={1.5} className="w-10 h-10 text-foreground" />
                  <div className="flex flex-col relative items-start">
                    <span className="absolute -top-6 right-0 border-2 border-border text-foreground font-medium text-2xl rounded-full w-12 h-12 flex items-center justify-center pt-0.5">
                      {id + 1}
                    </span>
                    <h3 className="text-base mt-6 font-medium text-foreground">
                      {process.title}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {process.description}
                    </p>
                  </div>
                </div>
              </MagicCard>
            </AnimationContainer>
          ))}
        </div>
      </MaxWidthWrapper>

      <MaxWidthWrapper className="py-10">
        <AnimationContainer delay={0.1}>
          <div className="flex flex-col items-center justify-center w-full py-8 max-w-xl mx-auto">
            <MagicBadge title="Simple Pricing" />
            <h2 className="text-center text-3xl md:text-5xl !leading-[1.1] font-medium text-foreground mt-6">
              Choose a plan that works for you
            </h2>
            <p className="mt-4 text-center text-lg text-muted-foreground max-w-lg">
              Start accepting bookings today and upgrade as your cleaning team scales.
            </p>
          </div>
        </AnimationContainer>
        <AnimationContainer delay={0.2}>
          <PricingCards />
        </AnimationContainer>
        <AnimationContainer delay={0.3}>
          <div className="flex items-center justify-center gap-6 mt-12 max-w-5xl mx-auto w-full">
            <div className="flex items-center gap-2">
              <CreditCardIcon className="w-5 h-5 text-foreground" />
              <span className="text-muted-foreground">No credit card required</span>
            </div>
          </div>
        </AnimationContainer>
      </MaxWidthWrapper>

      <MaxWidthWrapper className="py-10">
        <AnimationContainer delay={0.1}>
          <div className="flex flex-col items-center justify-center w-full py-8 max-w-xl mx-auto">
            <MagicBadge title="Our Customers" />
            <h2 className="text-center text-3xl md:text-5xl !leading-[1.1] font-medium text-foreground mt-6">
              What cleaning teams are saying
            </h2>
            <p className="mt-4 text-center text-lg text-muted-foreground max-w-lg">
              Real feedback from businesses using CleanFlow for daily booking operations.
            </p>
          </div>
        </AnimationContainer>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 place-items-start gap-4 md:gap-8 py-10">
          {[0, 3, 6].map((start) => (
            <div key={start} className="flex flex-col items-start h-min gap-6">
              {REVIEWS.slice(start, start + 3).map((review, index) => (
                <AnimationContainer delay={0.2 * index} key={review.username}>
                  <MagicCard className="md:p-0">
                    <Card className="flex flex-col w-full border-none h-min">
                      <CardHeader className="space-y-0">
                        <CardTitle className="text-lg font-medium text-muted-foreground">
                          {review.name}
                        </CardTitle>
                        <CardDescription>{review.username}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4 pb-4">
                        <p className="text-muted-foreground">{review.review}</p>
                      </CardContent>
                      <CardFooter className="w-full space-x-1 mt-auto">
                        {Array.from({ length: review.rating }, (_, i) => (
                          <StarIcon
                            key={i}
                            className="w-4 h-4 fill-yellow-500 text-yellow-500"
                          />
                        ))}
                      </CardFooter>
                    </Card>
                  </MagicCard>
                </AnimationContainer>
              ))}
            </div>
          ))}
        </div>
      </MaxWidthWrapper>

      <MaxWidthWrapper className="mt-20 max-w-[100vw] overflow-x-hidden">
        <AnimationContainer delay={0.1}>
          <LampContainer>
            <div className="flex flex-col items-center justify-center relative w-full text-center">
              <h2 className="bg-gradient-to-b from-neutral-200 to-neutral-400 py-4 bg-clip-text text-center text-4xl md:text-7xl !leading-[1.15] font-medium tracking-tight text-transparent mt-8">
                Book smarter, clean better, grow faster
              </h2>
              <p className="text-muted-foreground mt-6 max-w-md mx-auto">
                Give clients an effortless booking experience while your team stays perfectly scheduled.
              </p>
              <div className="mt-6">
                <Button>
                  Launch your booking page
                  <ArrowRightIcon className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </LampContainer>
        </AnimationContainer>
      </MaxWidthWrapper>
      </main>
      <div id="resources" />
      <LandingFooter />
    </div>
  );
}
