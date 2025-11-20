# Quick Start: Using Translations in BarangayCare

## Basic Usage

### 1. Import the hook

```typescript
import { useTranslation } from "react-i18next";
```

### 2. Use in your component

```typescript
export function MyComponent() {
  const { t } = useTranslation();

  return <h1>{t("dashboard.title")}</h1>;
}
```

## Common Translation Keys

### Navigation

- `t('nav.dashboard')` → Dashboard / Dashboard
- `t('nav.residents')` → Residents / Mga Residente
- `t('nav.officials')` → Barangay Officials / Mga Opisyal ng Barangay
- `t('nav.clearance')` → Clearance / Clearance
- `t('nav.complaints')` → Complaints / Mga Reklamo
- `t('nav.settings')` → Settings / Mga Setting
- `t('nav.logout')` → Logout / Mag-logout
- `t('nav.profile')` → Profile / Profile
- `t('nav.admin')` → Admin Panel / Admin Panel

### Common Actions

- `t('common.save')` → Save / I-save
- `t('common.cancel')` → Cancel / Kanselahin
- `t('common.delete')` → Delete / Burahin
- `t('common.edit')` → Edit / I-edit
- `t('common.add')` → Add / Magdagdag
- `t('common.search')` → Search / Maghanap
- `t('common.submit')` → Submit / Isumite
- `t('common.confirm')` → Confirm / Kumpirmahin
- `t('common.yes')` → Yes / Oo
- `t('common.no')` → No / Hindi

### Form Fields

- `t('residents.firstName')` → First Name / Pangalan
- `t('residents.lastName')` → Last Name / Apelyido
- `t('residents.email')` → Email / Email
- `t('residents.address')` → Address / Address
- `t('residents.contactNumber')` → Contact Number / Contact Number

### Messages

- `t('messages.saveSuccess')` → Successfully saved! / Matagumpay na na-save!
- `t('messages.error')` → An error occurred / May naganap na error
- `t('messages.confirmDelete')` → Are you sure you want to delete this item? / Sigurado ka bang gusto mong burahin ito?

## Complete Example Component

```typescript
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { toast } from "sonner";

export function ResidentForm() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Save logic here
    toast.success(t("messages.saveSuccess"));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h1 className="text-2xl font-bold">{t("residents.title")}</h1>

      <div>
        <Label htmlFor="firstName">{t("residents.firstName")}</Label>
        <Input
          id="firstName"
          value={formData.firstName}
          onChange={(e) =>
            setFormData({ ...formData, firstName: e.target.value })
          }
          placeholder={t("form.enterValue")}
        />
      </div>

      <div>
        <Label htmlFor="lastName">{t("residents.lastName")}</Label>
        <Input
          id="lastName"
          value={formData.lastName}
          onChange={(e) =>
            setFormData({ ...formData, lastName: e.target.value })
          }
          placeholder={t("form.enterValue")}
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit">{t("common.save")}</Button>
        <Button type="button" variant="outline">
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}
```

## All Available Translation Categories

See the full list in:

- `src/i18n/locales/en.ts` (English)
- `src/i18n/locales/fil.ts` (Filipino)

Categories:

- `nav.*` - Navigation items
- `common.*` - Common buttons/actions
- `settings.*` - Settings page
- `auth.*` - Authentication
- `dashboard.*` - Dashboard
- `residents.*` - Residents
- `officials.*` - Officials
- `clearance.*` - Clearance
- `complaints.*` - Complaints
- `reports.*` - Reports
- `profile.*` - Profile
- `admin.*` - Admin
- `messages.*` - Alerts/Messages
- `analytics.*` - Analytics
- `form.*` - Form labels

## Language Toggle Component

Already created and ready to use!

```typescript
import { LanguageToggle } from "./components/language-toggle";

// Use in your settings page or anywhere
<LanguageToggle />;
```

## Checking Current Language

```typescript
import { useTranslation } from "react-i18next";

export function MyComponent() {
  const { i18n } = useTranslation();

  // Get current language
  console.log(i18n.language); // 'en' or 'fil'

  // Change language programmatically
  i18n.changeLanguage("fil");
}
```

## Tips

1. **Always wrap user-facing text** in `t()` function
2. **Use descriptive keys** for better organization
3. **Add both translations** when creating new keys
4. **Test in both languages** before committing
5. **Keep keys consistent** across all components

## Need Help?

Check the full documentation in `FILIPINO_LANGUAGE_IMPLEMENTATION.md`
