import { createFileRoute, Link } from "@tanstack/react-router";
import {
  gekkoCoins,
  interests,
  profile,
  pumpCoins,
  rules,
  wallets,
} from "@/data/content";
import { ArrowUpRight } from "lucide-react";
import { HeroBackdrop } from "@/components/HeroBackdrop";
import { BlurFade } from "@/components/magicui/blur-fade";
import { BorderBeam } from "@/components/magicui/border-beam";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import {
  Kicker,
  OutLink,
  SectionTitle,
  TelegramCallout,
  WalletList,
} from "@/components/shell";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [{ title: "MemecoinDev · Official site" }],
  }),
});

function Home() {
  return (
    <div className="flex flex-col gap-14">
      <section className="relative grid items-start gap-8 overflow-hidden lg:grid-cols-[18rem_minmax(0,1fr)]">
        <HeroBackdrop />
        <figure className="relative z-10">
          <img
            src="/mark.jpg"
            alt="Mark, MemecoinDev"
            className="aspect-square w-full border border-line object-cover"
            width={512}
            height={512}
          />
          <figcaption className="mt-3 text-sm text-muted">
            {profile.name} · {profile.age} · {profile.place}
          </figcaption>
        </figure>
        <div className="relative z-10">
          <BlurFade delay={0} offset={14} inView>
            <div className="relative inline-flex overflow-hidden border border-gold/40 bg-surface px-3 py-1.5">
              <BorderBeam
                colorFrom="#e3a008"
                colorTo="#c45c26"
                size={40}
                duration={7}
                borderWidth={1}
              />
              <Kicker>Official dev account</Kicker>
            </div>
          </BlurFade>
          <BlurFade delay={0.18} offset={14} inView>
            <h1 className="mt-2 font-display text-6xl tracking-wide text-fg">
              {profile.handle}
            </h1>
          </BlurFade>
          <BlurFade delay={0.36} offset={14} inView>
            <p className="mt-4 max-w-xl text-lg text-fg">
              I build coin projects because I am sick of being rugged.
            </p>
          </BlurFade>
          <BlurFade delay={0.5} offset={14} inView>
            <p className="mt-3 max-w-xl text-muted">
              My name is {profile.name}. I am {profile.age}, from {profile.place}.
              Gamer, computer technician, car enthusiast, crypto lover, trader, 2A
              enthusiast, and a Cleveland sports fan.
            </p>
          </BlurFade>
          <BlurFade delay={0.62} offset={14} inView>
            <ul className="mt-5 flex flex-wrap gap-2">
              {rules.map((rule) => (
                <li
                  key={rule.title}
                  className="border border-line bg-surface px-3 py-2 text-sm font-semibold text-fg"
                >
                  {rule.title}
                </li>
              ))}
            </ul>
          </BlurFade>
          <BlurFade delay={0.78} offset={14} inView>
            <div className="mt-6 flex flex-wrap gap-2">
              {profile.x.map((account) => (
                <OutLink key={account.handle} href={account.href}>
                  @{account.handle}
                </OutLink>
              ))}
              <ShimmerButton
                href={profile.discord}
                shimmerColor="#f4efe6"
                background="#e3a008"
                className="min-h-11 border-copper/50 text-sm font-semibold text-gold-ink shadow-[0_0_24px_rgba(227,160,8,0.45)] hover:shadow-[0_0_32px_rgba(227,160,8,0.7)]"
              >
                Discord
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </ShimmerButton>
            </div>
          </BlurFade>
        </div>
      </section>

      <TelegramCallout />

      <section>
        <SectionTitle kicker="Free tool" title="Check a coin before you trust it">
          Same reason I build coins: I am sick of people getting rugged.
        </SectionTitle>
        <a
          href="https://rugcheck.memecoindev.vip"
          className="mt-6 block border border-line bg-surface p-5 hover:border-gold"
        >
          <p className="text-xs font-semibold tracking-widest text-gold uppercase">
            Solana · Robinhood chain
          </p>
          <h3 className="mt-2 font-display text-4xl tracking-wide">Rug Check</h3>
          <p className="mt-3 max-w-xl text-muted">
            Paste a CA, get an A–F risk grade. Free, no wallet needed.
          </p>
          <p className="mt-4 text-sm font-semibold text-gold">rugcheck.memecoindev.vip →</p>
        </a>
      </section>

      <section>
        <SectionTitle kicker="The rules" title="How these coins are launched">
          No hidden bag. If I buy, it is a public on-chain buy after the coin is live.
        </SectionTitle>
        <ol className="mt-6 grid gap-px border border-line bg-line sm:grid-cols-2">
          {rules.map((rule, index) => (
            <li key={rule.title} className="bg-surface p-5">
              <p className="font-display text-xl tracking-wide text-gold">
                0{index + 1}
              </p>
              <h3 className="mt-2 font-display text-2xl tracking-wide">{rule.title}</h3>
              <p className="mt-2 text-muted">{rule.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <SectionTitle kicker="Work with me" title="X, Discord, or email">
          That is the whole list. Collaborations go to the inbox below.
        </SectionTitle>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {profile.x.map((account) => (
            <a
              key={account.handle}
              href={account.href}
              target="_blank"
              rel="noreferrer"
              className="border border-line bg-surface p-5 hover:border-gold"
            >
              <p className="text-xs font-semibold tracking-widest text-gold uppercase">
                X
              </p>
              <p className="mt-2 font-display text-2xl tracking-wide">@{account.handle}</p>
            </a>
          ))}
          <a
            href={profile.discord}
            target="_blank"
            rel="noreferrer"
            className="border border-line bg-surface p-5 hover:border-gold"
          >
            <p className="text-xs font-semibold tracking-widest text-gold uppercase">
              Discord
            </p>
            <p className="mt-2 font-display text-2xl tracking-wide">Join the server</p>
          </a>
        </div>
        <p className="mt-4 text-muted">
          Email{" "}
          <a className="font-semibold text-gold hover:text-fg" href={`mailto:${profile.email}`}>
            {profile.email}
          </a>
        </p>
        <ul className="mt-6 flex flex-wrap gap-2">
          {interests.map((item) => (
            <li key={item} className="bg-surface-2 px-3 py-2 text-sm text-fg">
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionTitle kicker="Projects" title="Where the coins live">
          Two launchpads. Every contract on those pages is one I am willing to put my name on.
        </SectionTitle>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Link to="/pump" className="border border-line bg-surface p-5 hover:border-gold">
            <p className="text-xs font-semibold tracking-widest text-gold uppercase">
              Solana
            </p>
            <h3 className="mt-2 font-display text-4xl tracking-wide">Pump.fun</h3>
            <p className="mt-3 text-muted">
              {pumpCoins.map((coin) => coin.name).join(" · ")}
            </p>
          </Link>
          <Link to="/gekko" className="border border-line bg-surface p-5 hover:border-gold">
            <p className="text-xs font-semibold tracking-widest text-gold uppercase">
              Robinhood chain
            </p>
            <h3 className="mt-2 font-display text-4xl tracking-wide">Gekko.cash</h3>
            <p className="mt-3 text-muted">
              {gekkoCoins.map((coin) => coin.name).join(" · ")}
            </p>
          </Link>
        </div>
      </section>

      <section id="wallets">
        <SectionTitle kicker="Wallets" title="Addresses I actually use">
          Match these before you send anything. A similar address in a reply is not me.
        </SectionTitle>
        <div className="mt-6">
          <WalletList groups={wallets} />
        </div>
      </section>
    </div>
  );
}
