import ScrollReveal from "./ScrollReveal";

export default function SectionHeader({ eyebrow, title, description }) {
  return (
    <div className="mb-12 max-w-3xl">
      <ScrollReveal>
        <p className="text-xs uppercase tracking-[0.24em] text-white/40">
          {eyebrow}
        </p>
      </ScrollReveal>

      <ScrollReveal>
        <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
          {title}
        </h2>
      </ScrollReveal>

      <ScrollReveal>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-white/60 md:text-base">
          {description}
        </p>
      </ScrollReveal>
    </div>
  );
}