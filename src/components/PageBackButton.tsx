import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PageBackButton() {
  const navigate = useNavigate();

  return (
    <Button
      type="button"
      variant="outline"
      className="gap-2 rounded-[30px]"
      onClick={() => navigate(-1)}
    >
      <ArrowLeft className="h-4 w-4" />
      Voltar
    </Button>
  );
}