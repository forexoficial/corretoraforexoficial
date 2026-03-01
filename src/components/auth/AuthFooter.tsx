import { useTranslation } from "@/hooks/useTranslation";
import { Separator } from "@/components/ui/separator";

export function AuthFooter() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full py-6 px-4 relative z-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs text-muted-foreground">
            © {currentYear} Plataforma. {t("all_rights_reserved", "Todos os direitos reservados.")}
          </span>
        </div>

        <Separator className="mb-4 bg-border/50" />

        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-foreground text-center tracking-wide">
            {t("risk_warning_title", "AVISO DE RISCO:")}
          </h4>
          <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
            {t(
              "risk_warning_text",
              "A Plataforma fornece seus serviços exclusivamente em territórios em que é licenciada. A Plataforma não está autorizada pela Comissão de Valores Mobiliários (\"CVM\"), a diferença diretamente dos tipos de distribuição de valores mobiliários ou investidores residentes no Brasil. O portal de vinculação ou divulgação da República Federativa do Brasil não forma oferta direta de serviços endereçada a esses investidores."
            )}
          </p>
          <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
            {t(
              "risk_warning_rights",
              "Você tem direitos não-exclusivos e não transferíveis ao uso pessoal e não-comercial do IP disponibilizado por este site apenas em relação aos serviços oferecidos no próprio site."
            )}
          </p>
        </div>
      </div>
    </footer>
  );
}
