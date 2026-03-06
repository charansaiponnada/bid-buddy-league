import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import RoomPage from "./pages/Room";
import Results from "./pages/Results";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="flex min-h-screen flex-col">
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/room/:code" element={<RoomPage />} />
              <Route path="/results/:code" element={<Results />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <footer className="border-t border-border/60 bg-background/80 py-3 text-center text-sm text-muted-foreground">
            made with {" "}
            <span
              aria-label="heart"
              className="inline-block text-base font-semibold text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]"
            >
              ♥
            </span>{" "}
            by CSP
          </footer>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
