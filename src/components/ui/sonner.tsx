import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const isMobile = useIsMobile();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position={isMobile ? "top-center" : "bottom-right"}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:backdrop-blur-2xl group-[.toaster]:bg-background/60 group-[.toaster]:text-foreground group-[.toaster]:border group-[.toaster]:border-border/30 group-[.toaster]:shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] group-[.toaster]:rounded-[24px]",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-xl",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-xl",
          error: "group-[.toaster]:backdrop-blur-2xl group-[.toaster]:bg-destructive/60 group-[.toaster]:text-destructive-foreground group-[.toaster]:border group-[.toaster]:border-destructive/30 group-[.toaster]:shadow-[0_8px_32px_0_rgba(220,38,38,0.3)] group-[.toaster]:rounded-[24px]",
          success: "group-[.toaster]:backdrop-blur-2xl group-[.toaster]:bg-success/60 group-[.toaster]:text-success-foreground group-[.toaster]:border group-[.toaster]:border-success/30 group-[.toaster]:shadow-[0_8px_32px_0_rgba(34,197,94,0.3)] group-[.toaster]:rounded-[24px]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
