import BentoCard from "./BentoCard";

export default function BentoGrid({ cards }) {
  return (
    <section className="grid auto-rows-[220px] grid-cols-1 gap-5 md:grid-cols-6">
      {cards.map((card) => (
        <BentoCard key={card.title} {...card} />
      ))}
    </section>
  );
}