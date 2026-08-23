# Sikkerhet

## Publiseringsgrense

Dagens datasett og statiske bygg er bare godkjent for intern bruk. Oppgave 3
skal ligge bak autentisering. `deployment-policy.json` og
`scripts/verify_static_build.py` håndhever fil- og profilgrensen, men erstatter
ikke tilgangskontroll på hostingen.

Ikke legg hemmeligheter, tokens eller operative data i repositoryet. Bruk
ekstern `REGNSKAP_DATA_ROOT` og plattformens hemmelighetslager.

## Avhengigheter

Kjør produksjonsrevisjon per app:

```bash
npm run audit:task1
npm run audit:task2
npm run audit:task3
```

Kontroll 23. august 2026 rapporterte samme 31 funn i alle tre apper:
1 lavt, 15 moderate, 8 høye og 7 kritiske. De alvorligste funnene ligger i
Evidence sin transitive avhengighetskjede. `npm audit` foreslår blant annet en
major-nedgradering av `@evidence-dev/evidence`, så `npm audit fix --force` skal
ikke kjøres ukritisk.

Dette er en eksplisitt blocker for eksponering mot internett. Før slik
publisering må Evidence-avhengighetene oppgraderes eller erstattes, hele test-
og byggløpet kjøres, og en ny revisjon dokumenteres. Intern hosting må fortsatt
bruke minst mulig tilgang, sikker transport og autentisering.
