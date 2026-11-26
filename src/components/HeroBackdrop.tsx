import { DotPattern } from "./magicui/dot-pattern";

/** Homepage hero atmosphere: gold dotted field faded off the copy, plus a headline glow. */
export function HeroBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -inset-x-5 -inset-y-10 sm:-inset-x-8 sm:-inset-y-12 [mask-image:radial-gradient(ellipse_92%_86%_at_50%_46%,#000_0%,#000_42%,transparent_78%)]"
    >
      <div className="hero-headline-glow absolute inset-0" />
      <DotPattern
        width={16}
        height={16}
        cr={1.6}
        className="text-gold/40 [mask-image:radial-gradient(ellipse_95%_55%_at_50%_72%,transparent_0%,transparent_44%,rgba(255,255,255,0.4)_72%,white_94%)] lg:[mask-image:radial-gradient(ellipse_72%_82%_at_72%_42%,transparent_0%,transparent_40%,rgba(255,255,255,0.45)_70%,white_92%)]"
      />
    </div>
  );
}
