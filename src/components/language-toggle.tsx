import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Label } from "./ui/label";

export function LanguageToggle() {
  const { i18n, t } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="flex flex-col space-y-2">
      <Label htmlFor="language-select" className="text-sm font-medium">
        {t("settings.language")}
      </Label>
      <Select value={i18n.language} onValueChange={changeLanguage}>
        <SelectTrigger id="language-select" className="w-full">
          <SelectValue placeholder={t("settings.selectLanguage")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">{t("settings.english")}</SelectItem>
          <SelectItem value="fil">{t("settings.filipino")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
