import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Clientes from "./pages/Clientes.tsx";
import Equipamentos from "./pages/Equipamentos.tsx";
import Locacoes from "./pages/Locacoes.tsx";
import NovaLocacao from "./pages/NovaLocacao.tsx";
import Contrato from "./pages/Contrato.tsx";
import Feriados from "./pages/Feriados.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/equipamentos" element={<Equipamentos />} />
          <Route path="/locacoes" element={<Locacoes />} />
          <Route path="/locacoes/nova" element={<NovaLocacao />} />
          <Route path="/locacoes/:id/contrato" element={<Contrato />} />
          <Route path="/feriados" element={<Feriados />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
