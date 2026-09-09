import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Analytics } from "@/components/Analytics";
import { AIChat } from "@/components/AIChat";
import SpyLanding from "./pages/SpyLanding.tsx";

// After a new deploy, a page still running the old build asks for chunk files that
// no longer exist. Retry once, then reload the app so the newest build is fetched.
const lazyWithReload = <T extends { default: React.ComponentType<never> }>(
  factory: () => Promise<T>,
) =>
  lazy(() =>
    factory().catch(async () => {
      try {
        return await factory();
      } catch (err) {
        const key = "chunk-reload-at";
        const last = Number(sessionStorage.getItem(key) ?? 0);
        if (Date.now() - last > 10_000) {
          sessionStorage.setItem(key, String(Date.now()));
          window.location.reload();
        }
        throw err;
      }
    }),
  );

const Index = lazyWithReload(() => import("./pages/Index.tsx"));

const Academy = lazyWithReload(() => import("./pages/Academy.tsx"));
const NotFound = lazyWithReload(() => import("./pages/NotFound.tsx"));
const Auth = lazyWithReload(() => import("./pages/Auth.tsx"));
const Sim = lazyWithReload(() => import("./pages/Sim.tsx"));
const GameLobby = lazyWithReload(() => import("./pages/GameLobby.tsx"));
const CreateGame = lazyWithReload(() => import("./pages/CreateGame.tsx"));
const AcademyModule = lazyWithReload(() => import("./pages/AcademyModule.tsx"));
const Privacy = lazyWithReload(() => import("./pages/legal/Privacy.tsx"));
const Terms = lazyWithReload(() => import("./pages/legal/Terms.tsx"));
const AffiliateDisclosure = lazyWithReload(() => import("./pages/legal/AffiliateDisclosure.tsx"));
const Trade = lazyWithReload(() => import("./pages/Trade.tsx"));
const Screener = lazyWithReload(() => import("./pages/Screener.tsx"));
const Calendar = lazyWithReload(() => import("./pages/Calendar.tsx"));
const Watchlist = lazyWithReload(() => import("./pages/Watchlist.tsx"));
const About = lazyWithReload(() => import("./pages/About.tsx"));
const Contact = lazyWithReload(() => import("./pages/Contact.tsx"));
const Disclaimer = lazyWithReload(() => import("./pages/Disclaimer.tsx"));
const DataSources = lazyWithReload(() => import("./pages/DataSources.tsx"));
const FAQ = lazyWithReload(() => import("./pages/FAQ.tsx"));
const LearnPatterns = lazyWithReload(() => import("./pages/LearnPatterns.tsx"));
const LearnBasics = lazyWithReload(() => import("./pages/LearnBasics.tsx"));
const LearnIndicators = lazyWithReload(() => import("./pages/LearnIndicators.tsx"));
const LearnHub = lazyWithReload(() => import("./pages/LearnHub.tsx"));
const LearnReading = lazyWithReload(() => import("./pages/LearnReading.tsx"));
const LearnPortfolio = lazyWithReload(() => import("./pages/LearnPortfolio.tsx"));
const LearnAdvanced = lazyWithReload(() => import("./pages/LearnAdvanced.tsx"));
const StockTicker = lazyWithReload(() => import("./pages/StockTicker.tsx"));
const StartHere = lazyWithReload(() => import("./pages/StartHere.tsx"));
const MarketBrief = lazyWithReload(() => import("./pages/MarketBrief.tsx"));
const JargonTranslator = lazyWithReload(() => import("./pages/JargonTranslator.tsx"));
const BlogIndex = lazyWithReload(() => import("./pages/BlogIndex.tsx"));
const BlogPost = lazyWithReload(() => import("./pages/BlogPost.tsx"));
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Analytics />
        <Suspense fallback={null}>

          <Routes>
            <Route path="/" element={<SpyLanding />} />
            <Route path="/dashboard" element={<Index />} />
            <Route path="/stocks" element={<Index />} />
            <Route path="/stocks/:ticker" element={<StockTicker />} />
            <Route path="/news" element={<MarketBrief />} />
            <Route path="/start" element={<StartHere />} />
            <Route path="/academy" element={<Academy />} />
            <Route path="/academy/:id" element={<AcademyModule />} />
            <Route path="/market-brief" element={<MarketBrief />} />
            <Route path="/translate" element={<JargonTranslator />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/sim" element={<Sim />} />
            <Route path="/sim/lobby" element={<GameLobby />} />
            <Route path="/sim/create" element={<CreateGame />} />
            <Route path="/simulator" element={<GameLobby />} />
            <Route path="/sim/trade/:symbol" element={<Trade />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/affiliate-disclosure" element={<AffiliateDisclosure />} />
            <Route path="/screener" element={<Screener />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/watchlist" element={<Watchlist />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/disclaimer" element={<Disclaimer />} />
            <Route path="/data-sources" element={<DataSources />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/learn" element={<LearnHub />} />
            <Route path="/learn/basics" element={<LearnBasics />} />
            <Route path="/learn/patterns" element={<LearnPatterns />} />
            <Route path="/learn/indicators" element={<LearnIndicators />} />
            <Route path="/learn/reading" element={<LearnReading />} />
            <Route path="/learn/portfolio" element={<LearnPortfolio />} />
            <Route path="/learn/advanced" element={<LearnAdvanced />} />
            <Route path="/blog" element={<BlogIndex />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <AIChat />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);
export default App;
