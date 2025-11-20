import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

export function HeaderExample() {
  const { t } = useTranslation();

  return (
    <header>
      <nav>
        <Button onClick={() => console.log("dashboard")}>
          {t("nav.dashboard")}
        </Button>
        <Button onClick={() => console.log("residents")}>
          {t("nav.residents")}
        </Button>
        <Button onClick={() => console.log("clearance")}>
          {t("nav.clearance")}
        </Button>
        <Button onClick={() => console.log("settings")}>
          {t("nav.settings")}
        </Button>
        <Button onClick={() => console.log("logout")}>{t("nav.logout")}</Button>
      </nav>
    </header>
  );
}

export function DashboardExample() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t("dashboard.title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.overview")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <h3>{t("dashboard.totalResidents")}</h3>
              <p>150</p>
            </div>
            <div>
              <h3>{t("dashboard.pendingClearance")}</h3>
              <p>12</p>
            </div>
            <div>
              <h3>{t("dashboard.activeOfficials")}</h3>
              <p>8</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 mt-4">
        <Button>{t("common.save")}</Button>
        <Button variant="outline">{t("common.cancel")}</Button>
        <Button variant="destructive">{t("common.delete")}</Button>
      </div>
    </div>
  );
}

export function FormExample() {
  const { t } = useTranslation();

  return (
    <form>
      <div>
        <label>{t("residents.firstName")}</label>
        <input type="text" placeholder={t("form.enterValue")} />
      </div>

      <div>
        <label>{t("residents.lastName")}</label>
        <input type="text" placeholder={t("form.enterValue")} />
      </div>

      <div>
        <label>{t("residents.gender")}</label>
        <select>
          <option>{t("form.selectOption")}</option>
          <option value="male">{t("residents.male")}</option>
          <option value="female">{t("residents.female")}</option>
        </select>
      </div>

      <div className="flex gap-2">
        <Button type="submit">{t("common.submit")}</Button>
        <Button type="button" variant="outline">
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
