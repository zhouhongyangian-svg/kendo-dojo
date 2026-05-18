import { Redirect, Link } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";

export default function Landing() {
  const { member, isLoading } = useAuth();

  if (isLoading) return null;

  if (member) {
    return <Redirect to={member.role === "admin" ? "/admin" : "/dashboard"} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="absolute top-0 w-full z-10 p-5 flex justify-between items-center bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center gap-3">
          <img
            src="/logo-transparent.png"
            alt="长安剑士会"
            className="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(37,99,188,0.6)]"
          />
          <div>
            <span className="text-base font-bold tracking-widest text-primary block leading-tight">长安剑士会</span>
            <span className="text-[10px] text-muted-foreground tracking-widest uppercase">Chang'an Kendo</span>
          </div>
        </div>
        <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground font-medium rounded-none tracking-widest">
          <Link href="/sign-in">登 录</Link>
        </Button>
      </header>

      <main className="flex-1 relative flex items-center justify-center">
        <div className="absolute inset-0 z-0">
          <img
            src="/kendo-hero.png"
            alt="Kendo Dojo"
            className="w-full h-full object-cover object-center opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-black/40" />
        </div>

        <div className="relative z-10 text-center max-w-3xl px-6 flex flex-col items-center">
          {/* Large logo */}
          <img
            src="/logo-transparent.png"
            alt="长安剑士会"
            className="w-44 md:w-56 h-auto object-contain mb-6 drop-shadow-[0_0_30px_rgba(37,99,188,0.5)]"
          />
          <h2 className="text-4xl md:text-6xl font-serif font-bold tracking-wider mb-4 drop-shadow-lg text-white">
            剑道·修心
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground font-light mb-10 drop-shadow-md max-w-xl">
            以剑磨心，以心御剑。传承正统剑道精神，打造专注、自律、优雅的修习空间。
          </p>
          <Button
            asChild
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-none text-lg px-12 py-6 tracking-widest border border-transparent shadow-[0_0_24px_rgba(37,99,188,0.4)]"
          >
            <Link href="/sign-in">开 始 修 习</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
