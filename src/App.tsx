import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
const Academy = lazy(() => import("./pages/Academy.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const Auth = lazy(() => import("./pages/Auth.tsx"));
const Sim = lazy(() => import("./pages/Sim.tsx"));
const Trade = lazy(() => import("./pages/Trade.tsx"));
const Screener = lazy(() => import("./pages/Screener.tsx"));
const Calendar = lazy(() => import("./pages/Calendar.tsx"));
const Watchlist = lazy(() => import("./pages/Watchlist.tsx"));
const About = lazy(() => import("./pages/About.tsx"));
const Contact = lazy(() => import("./pages/Contact.tsx"));
const Disclaimer = lazy(() => import("./pages/Disclaimer.tsx"));
const DataSources = lazy(() => import("./pages/DataSources.tsx"));
const FAQ = lazy(() => import("./pages/FAQ.tsx"));
const LearnPatterns = lazy(() => import("./pages/LearnPatterns.tsx"));
const LearnBasics = lazy(() => import("./pages/LearnBasics.tsx"));
const LearnIndicators = lazy(() => import("./pages/LearnIndicators.tsx"));
const LearnHub = lazy(() => import("./pages/LearnHub.tsx"));
const LearnReading = lazy(() => import("./pages/LearnReading.tsx"));
const LearnPortfolio = lazy(() => import("./pages/LearnPortfolio.tsx"));
const LearnAdvanced = lazy(() => import("./pages/LearnAdvanced.tsx"));
const StockTicker = lazy(() => import("./pages/StockTicker.tsx"));
const StartHere = lazy(() => import("./pages/StartHere.tsx"));
const MarketBrief = lazy(() => import("./pages/MarketBrief.tsx"));
const JargonTranslator = lazy(() => import("./pages/JargonTranslator.tsx"));
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
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/stocks" element={<Index />} />
            <Route path="/stocks/:ticker" element={<StockTicker />} />
            <Route path="/news" element={<MarketBrief />} />
            <Route path="/start" element={<StartHere />} />
            <Route path="/academy" element={<Academy />} />
            <Route path="/market-brief" element={<MarketBrief />} />
            <Route path="/translate" element={<JargonTranslator />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/sim" element={<Sim />} />
            <Route path="/simulator" element={<Sim />} />
            <Route path="/sim/trade/:symbol" element={<Trade />} />
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);
export default App;
