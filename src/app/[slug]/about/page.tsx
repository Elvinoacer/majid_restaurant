import { ShieldCheck, Sprout, Heart, Award } from "lucide-react";
import { getContextRestaurant } from "@/lib/restaurant/context";

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
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
          Our story
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-foreground sm:text-4xl">
          About {restaurant.name}
        </h1>
        {restaurant.tagline && (
          <p className="mt-2 text-base text-muted-foreground">{restaurant.tagline}</p>
        )}
      </header>

      {restaurant.coverImageUrl && (
         
        <img
          src={restaurant.coverImageUrl}
          alt={`${restaurant.name} cover`}
          className="mb-8 aspect-[16/9] w-full rounded-xl object-cover"
        />
      )}

      {about?.story && (
        <Section icon={<Heart className="h-5 w-5" />} title="Our story">
          <p className="whitespace-pre-line text-base leading-relaxed text-foreground/85">
            {about.story}
          </p>
        </Section>
      )}

      {about?.mission && (
        <Section icon={<Award className="h-5 w-5" />} title="Our mission">
          <p className="whitespace-pre-line text-base leading-relaxed text-foreground/85">
            {about.mission}
          </p>
        </Section>
      )}

      {about?.hygieneStandards && (
        <Section icon={<ShieldCheck className="h-5 w-5" />} title="Hygiene & safety">
          <p className="whitespace-pre-line text-base leading-relaxed text-foreground/85">
            {about.hygieneStandards}
          </p>
        </Section>
      )}

      {about?.sourcing && (
        <Section icon={<Sprout className="h-5 w-5" />} title="Sourcing">
          <p className="whitespace-pre-line text-base leading-relaxed text-foreground/85">
            {about.sourcing}
          </p>
        </Section>
      )}

      {!about && (
        <p className="text-base text-muted-foreground">
          We&apos;re working on telling our story — check back soon.
        </p>
      )}
    </div>
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
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          {icon}
        </span>
        <h2 className="font-display text-xl font-bold text-foreground">{title}</h2>
      </div>
      <div className="prose prose-sm max-w-none sm:prose-base">{children}</div>
    </section>
  );
}

export async function generateMetadata() {
  return {
    title: "About Us",
    description: "The story behind the restaurant.",
  };
}
