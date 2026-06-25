# Portfolio screenshots

Use real local data for portfolio screenshots. The capture script writes PNG files only to the ignored
`test-results/portfolio-screenshots/` directory.

## Seed

```powershell
npm run db:generate
npm run db:migrate
npm run db:seed -- --portfolio
```

## Run the app

```powershell
npm run build
npm run start -- -H 127.0.0.1 -p 3000
```

## Capture

In a second terminal:

```powershell
$env:PLAYWRIGHT_BASE_URL = "http://127.0.0.1:3000"
npm run screenshots:portfolio
```

List the configured shots without opening the browser:

```powershell
npm run screenshots:portfolio -- --list
```

## Shot list

- `01-radar-today.png` - Radar dzisiaj dashboard.
- `02-library-expanded-repo.png` - Biblioteka with filters and an expanded repository panel.
- `03-action-queue.png` - Kolejka akcji.
- `04-ideas-candidates.png` - Kandydaci panel.
- `05-weekly-reports.png` - Raporty tygodniowe panel.
- `06-command-palette.png` - Paleta komend.

Generated PNGs are local review artifacts. Keep raw captures under `test-results/portfolio-screenshots/` unless a later
portfolio-docs task explicitly selects images for this directory.
