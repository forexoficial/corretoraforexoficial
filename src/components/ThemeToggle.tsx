import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useClickSound } from "@/hooks/useClickSound";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const { withClickSound } = useClickSound();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-foreground hover:bg-accent hover:text-accent-foreground">
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Alternar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-popover backdrop-blur-xl border-border">
        <DropdownMenuItem 
          onClick={withClickSound(() => setTheme("light"))}
          className="cursor-pointer text-foreground"
        >
          <Sun className="mr-2 h-4 w-4" />
          Claro (Light)
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={withClickSound(() => setTheme("dark"))}
          className="cursor-pointer text-foreground"
        >
          <Moon className="mr-2 h-4 w-4" />
          Escuro (Default)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
