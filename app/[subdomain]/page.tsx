import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Company } from "@/app/models/Company";
import { Service } from "@/app/models/Service";
import { PublicTemplateA } from "@/components/public-site/template-a";
import { PublicTemplateB } from "@/components/public-site/template-b";

type PageProps = {
  params: Promise<{ subdomain: string }>;
};

export default async function PublicSiteByPathPage({ params }: PageProps) {
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

  // Fetch all main services for this company with their sub-services and addons
  const mainServices = await Service.find({
    companyId: company._id,
    category: "main",
    status: "active",
  })
    .select(
      "_id name description availability percentage priceType basePrice hourlyRate status category estimatedTime"
    )
    .lean();

  const mainIds = mainServices.map((s: any) => s._id);

  let servicesWithHierarchy: any[] = [];

  if (mainIds.length > 0) {
    const children = await Service.find({
      parentId: { $in: mainIds },
      category: { $in: ["sub", "addon"] },
      status: "active",
      companyId: company._id,
    })
      .select(
        "_id name description availability percentage priceType basePrice hourlyRate status category estimatedTime parentId companyId"
      )
      .lean();

    const byParent: Record<string, { sub: any[]; addon: any[] }> = {};
    for (const id of mainIds) {
      byParent[id.toString()] = { sub: [], addon: [] };
    }
    for (const c of children as any[]) {
      const pid = c.parentId?.toString();
      if (!pid || !byParent[pid]) continue;
      if (c.category === "sub") byParent[pid].sub.push(c);
      else if (c.category === "addon") byParent[pid].addon.push(c);
    }

    servicesWithHierarchy = mainServices.map((main: any) => ({
      ...main,
      subServices: byParent[main._id.toString()]?.sub ?? [],
      addons: byParent[main._id.toString()]?.addon ?? [],
    }));
  }

  // Ensure server data passed to Client Components is fully JSON-serializable.
  const serializedCompany = JSON.parse(JSON.stringify(company));
  const serializedServices = JSON.parse(JSON.stringify(servicesWithHierarchy));

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
    return <PublicTemplateB company={serializedCompany} subdomain={subdomain} />;
  }

  return (
    <PublicTemplateA
      company={serializedCompany}
      subdomain={subdomain}
      services={serializedServices}
    />
  );
}
