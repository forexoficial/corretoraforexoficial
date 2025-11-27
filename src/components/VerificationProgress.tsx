import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export const VerificationProgress = () => {
  const navigate = useNavigate();
  const percentage = 80;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative w-14 h-14 cursor-pointer group">
          <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 56 56">
            {/* Background circle */}
            <circle
              cx="28"
              cy="28"
              r="24"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              className="text-muted-foreground/20"
            />
            {/* Progress circle */}
            <circle
              cx="28"
              cy="28"
              r="24"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 24}`}
              strokeDashoffset={`${2 * Math.PI * 24 * (1 - percentage / 100)}`}
              className="text-primary transition-all group-hover:text-primary/80"
              strokeLinecap="round"
            />
          </svg>
          {/* Percentage text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-foreground">
              {percentage}%
            </span>
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <Info className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm mb-1">
                Complete seu cadastro
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Você está quase lá! Para desbloquear todos os recursos da plataforma e começar a operar com dinheiro real, é necessário verificar sua identidade.
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 rounded-full bg-success"></div>
              <span className="text-muted-foreground">Conta criada</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 rounded-full bg-success"></div>
              <span className="text-muted-foreground">Email confirmado</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 rounded-full bg-muted"></div>
              <span className="text-muted-foreground">Identidade pendente</span>
            </div>
          </div>

          <Button 
            onClick={() => navigate('/verify-identity')}
            className="w-full"
            size="sm"
          >
            Verificar Identidade
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
