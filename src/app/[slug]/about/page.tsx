import Image from "next/image";
import { ShieldCheck, Sprout, Heart, Award } from "lucide-react";
import { getContextRestaurant } from "@/lib/restaurant/context";
import { Container } from "@/components/premium/container";
import { PageHeader } from "@/components/premium/page-header";
import { PremiumCard } from "@/components/premium/card";

export const dynamic = "force-dynamic";

/**
 * About page (PRD §5.21).
 *
 * Renders the owner-editable rich-text fields: story, mission, hygiene
 * standards, sourcing. Falls back to a friendly message if AboutContent
 * hasn't been created yet.
 */
export default async function AboutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { restaurant, db: tenant } = await getContextRestaurant();
  const about = await tenant.aboutContent.findFirst();

  return (
    <Container className="py-6 sm:py-10">
      <PageHeader
        eyebrow="Our story"
        title={`About ${restaurant.name}`}
        subtitle={restaurant.tagline ?? undefined}
      />

      {restaurant.coverImageUrl && (
        <div className="relative mb-10 aspect-[16/9] w-full overflow-hidden rounded-2xl bg-muted elevation-1">
          <Image
            src={restaurant.coverImageUrl}
            alt={`${restaurant.name} cover`}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 1024px"
            className="object-cover"
          />
        </div>
      )}

      {about?.story && (
        <Section icon={<Heart className="h-5 w-5" />} title="Our story">
          {about.story}
        </Section>
      )}

      {about?.mission && (
        <Section icon={<Award className="h-5 w-5" />} title="Our mission">
          {about.mission}
        </Section>
      )}

      {about?.hygieneStandards && (
        <Section icon={<ShieldCheck className="h-5 w-5" />} title="Hygiene & safety">
          {about.hygieneStandards}
        </Section>
      )}

      {about?.sourcing && (
        <Section icon={<Sprout className="h-5 w-5" />} title="Sourcing">
          {about.sourcing}
        </Section>
      )}

      {!about && (
        <PremiumCard className="p-8 text-center">
          <p className="text-base text-muted-foreground">
            We&apos;re working on telling our story — check back soon.
          </p>
        </PremiumCard>
      )}
    </Container>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </span>
        <h2 className="font-display text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {title}
        </h2>
      </div>
      <PremiumCard className="p-5 sm:p-6">
        <p className="whitespace-pre-line text-base leading-relaxed text-foreground/85">
          {children}
        </p>
      </PremiumCard>
    </section>
  );
}

export async function generateMetadata() {
  return {
    title: "About Us",
    description: "The story behind the restaurant.",
  };
}
