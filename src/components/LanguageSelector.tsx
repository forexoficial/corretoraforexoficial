import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguageContext } from "@/contexts/LanguageContext";
import flagEN from "@/assets/flag-en.webp";
import flagPT from "@/assets/flag-pt.webp";
import flagES from "@/assets/flag-es.webp";

const languages = [
  { code: "en", name: "EN", flag: flagEN },
  { code: "pt", name: "PT", flag: flagPT },
  { code: "es", name: "ES", flag: flagES },
];

export const LanguageSelector = () => {
  const { language, setLanguage } = useLanguageContext();

  return (
    <Select value={language} onValueChange={setLanguage}>
      <SelectTrigger className="w-8 h-8 border-0 bg-transparent p-0 hover:bg-transparent focus:ring-0 focus:ring-offset-0 [&>svg]:hidden">
        <SelectValue>
          <img
            src={languages.find((l) => l.code === language)?.flag}
            alt={language}
            className="w-8 h-8 rounded-full object-cover cursor-pointer"
          />
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-card border-border z-50">
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            <div className="flex items-center gap-2">
              <img
                src={lang.flag}
                alt={lang.name}
                className="w-5 h-5 rounded-full object-cover"
              />
              <span className="text-sm font-medium">{lang.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
