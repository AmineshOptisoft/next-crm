import { BarChart3Icon, FolderOpenIcon, WandSparklesIcon } from "lucide-react";

export const COMPANIES = [
  { name: "Asana", logo: "/assets/company-01.svg" },
  { name: "Tidal", logo: "/assets/company-02.svg" },
  { name: "Innovaccer", logo: "/assets/company-03.svg" },
  { name: "Linear", logo: "/assets/company-04.svg" },
  { name: "Raycast", logo: "/assets/company-05.svg" },
  { name: "Labelbox", logo: "/assets/company-06.svg" },
] as const;

export const PROCESS = [
  {
    title: "Set up your service profile",
    description:
      "Add cleaning services, pricing, and availability so customers can book in minutes.",
    icon: FolderOpenIcon,
  },
  {
    title: "Accept bookings automatically",
    description:
      "Capture new appointments from your booking page and sync them to your schedule instantly.",
    icon: WandSparklesIcon,
  },
  {
    title: "Track growth and retention",
    description:
      "Measure repeat clients, team utilization, and revenue trends from one dashboard.",
    icon: BarChart3Icon,
  },
] as const;

export const REVIEWS = [
  {
    name: "Ava Thompson",
    username: "@avacleanliving",
    rating: 5,
    review:
      "We cut no-shows almost instantly. Clients now book and confirm cleanings without back-and-forth calls.",
  },
  {
    name: "Noah Carter",
    username: "@sparklecrew",
    rating: 4,
    review:
      "Our dispatch flow is finally organized. It is simple for staff and even simpler for customers.",
  },
  {
    name: "Sophia Nguyen",
    username: "@mintmaidco",
    rating: 5,
    review:
      "The dashboard helps us see peak demand and optimize routes every week.",
  },
  {
    name: "Liam Brooks",
    username: "@freshhomepros",
    rating: 4,
    review:
      "Clean design and smooth booking flow. New customers can schedule in under a minute.",
  },
  {
    name: "Mia Patel",
    username: "@tidyteam",
    rating: 5,
    review:
      "We replaced spreadsheets and manual reminders. Everything is automated now.",
  },
  {
    name: "Ethan Rivera",
    username: "@shineandserve",
    rating: 4,
    review:
      "Support was excellent during setup, and we saw more repeat bookings in the first month.",
  },
  {
    name: "Isabella Reed",
    username: "@clearspaceclean",
    rating: 5,
    review:
      "A complete booking system tailored to service businesses like ours.",
  },
  {
    name: "Lucas Morgan",
    username: "@neatnestco",
    rating: 4,
    review: "Simple, reliable, and perfect for handling recurring client schedules.",
  },
  {
    name: "Charlotte Wells",
    username: "@pristinepartners",
    rating: 5,
    review:
      "This platform transformed our workflow from inquiry to completed cleaning.",
  },
] as const;

export const PLANS = [
  {
    name: "Starter",
    info: "For solo cleaners and new businesses",
    price: { monthly: 0, yearly: 0 },
    features: [
      { text: "Online booking page" },
      { text: "Up to 30 bookings / month" },
      { text: "Email confirmations", tooltip: "Automatic customer confirmations" },
      { text: "Basic support" },
    ],
    btn: { text: "Start free", href: "/" },
  },
  {
    name: "Growth",
    info: "For growing teams with recurring clients",
    price: { monthly: 29, yearly: Math.round(29 * 12 * (1 - 0.12)) },
    features: [
      { text: "Unlimited bookings" },
      { text: "Recurring cleanings" },
      { text: "Route planning", tooltip: "Optimize travel between jobs" },
      { text: "Priority support" },
    ],
    btn: { text: "Upgrade to Growth", href: "/" },
  },
  {
    name: "Pro Teams",
    info: "For multi-location cleaning operations",
    price: { monthly: 79, yearly: Math.round(79 * 12 * (1 - 0.12)) },
    features: [
      { text: "Multi-team scheduling" },
      { text: "Advanced analytics" },
      { text: "Dedicated success manager" },
      { text: "Custom integrations" },
    ],
    btn: { text: "Contact sales", href: "/" },
  },
] as const;
