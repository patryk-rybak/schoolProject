# Frontend

Warstwa interfejsu użytkownika — tutaj mieszka kod frontendu (routing, komponenty,
hooki, style) oraz opisy planowanych modułów.

| Moduł | Zakres | Status |
| --- | --- | --- |
| [`auth-form/`](./auth-form/README.md) | logowanie i rejestracja | planowane |
| [`aed-form/`](./aed-form/README.md) | dodawanie i edycja defibrylatora | planowane |
| [`map/`](./map/README.md) | mapa AED z filtrami i szczegółami | częściowo istnieje |
| [`social-media/`](./social-media/README.md) | propozycje postów kampanii | planowane |

Zasady wspólne dla wszystkich modułów frontendu:

- komponenty z `frontend/components/ui/` (shadcn, `new-york`) — bez ręcznego
  duplikowania primitywów,
- WCAG 2.2 AA i pełna responsywność (320 px → desktop),
- brak sekretów w kodzie klienta; dane przez loadery/server functions,
- teksty interfejsu po polsku, spójne z resztą aplikacji.
