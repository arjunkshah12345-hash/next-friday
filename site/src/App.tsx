import { Categories, Speed } from "@/components/site/categories"
import { Hero } from "@/components/site/hero"
import { Footer, Lookup, Method } from "@/components/site/method"
import { Hardest, NotADate } from "@/components/site/phrases"
import { Leaderboard, Outcomes } from "@/components/site/results"
import { Divider } from "@/components/dithercn/divider"

const Rule = () => <div className="mx-auto max-w-[1280px] px-5 pt-28 md:px-16"><Divider decorative fade={0.8} /></div>

export default function App() {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-foreground focus:px-3 focus:py-2 focus:text-background">Skip to the results</a>
      <header className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-5 md:px-16">
        <a href="#top" className="font-serif text-2xl tracking-[-0.01em]">Next Friday</a>
        <nav aria-label="Main" className="flex gap-5 text-sm text-muted-foreground [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center">
          <a className="hover:text-foreground" href="#results">Results</a>
          <a className="hover:text-foreground" href="#method">Method</a>
          <a className="hover:text-foreground" href="data/results.json" download>Data</a>
        </nav>
      </header>
      <main id="main">
        <Hero />
        <Leaderboard />
        <Rule />
        <Outcomes />
        <Categories />
        <Speed />
        <Rule />
        <Hardest />
        <NotADate />
        <Rule />
        <Method />
        <Lookup />
      </main>
      <Footer />
    </>
  )
}
