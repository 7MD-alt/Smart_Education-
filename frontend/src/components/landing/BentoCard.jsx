const sizeMap = {
  sm: "md:col-span-2 md:row-span-1",
  md: "md:col-span-3 md:row-span-1",
  lg: "md:col-span-4 md:row-span-1",
  xl: "md:col-span-3 md:row-span-2",
};

export default function BentoCard({
  title,
  description,
  icon: Icon,
  size = "md",
}) {
  return (
    <div
      className={[
        "group relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:bg-white/[0.05]",
        "shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset]",
        sizeMap[size],
      ].join(" ")}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.09),transparent_35%)] opacity-0 transition duration-500 group-hover:opacity-100" />

      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-start justify-between">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <Icon className="h-5 w-5 text-white/85" />
          </div>
          <div className="h-2 w-2 rounded-full bg-white/25" />
        </div>

        <div className="mt-auto">
          <h3 className="text-xl font-medium tracking-tight text-white">
            {title}
          </h3>
          <p className="mt-3 max-w-md text-sm leading-7 text-white/55">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}