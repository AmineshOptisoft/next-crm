import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Company } from "@/app/models/Company";
import { PublicTemplateA } from "@/components/public-site/template-a";
import { PublicTemplateB } from "@/components/public-site/template-b";

type PageProps = {
  params: Promise<{ subdomain: string }>;
};

export default async function PublicSitePage({ params }: PageProps) {
  const { subdomain: rawSubdomain } = await params;
  const subdomain = rawSubdomain?.toLowerCase();

  if (!subdomain) {
    notFound();
  }

  await connectDB();

  const company: any = await Company.findOne({
    $or: [{ subdomain }, { "publicSites.subdomain": subdomain }],
  }).lean();

  if (!company) {
    notFound();
  }

  let template: "templateA" | "templateB" = "templateA";

  if (company.subdomain === subdomain && company.publicTemplate) {
    template = company.publicTemplate;
  } else if (Array.isArray(company.publicSites)) {
    const match = company.publicSites.find((s: any) => s.subdomain === subdomain);
    if (match?.template === "templateB") {
      template = "templateB";
    } else if (match?.template === "templateA") {
      template = "templateA";
    }
  }

  if (template === "templateB") {
    return <PublicTemplateB company={company} />;
  }

  return <PublicTemplateA company={company} />;
}

