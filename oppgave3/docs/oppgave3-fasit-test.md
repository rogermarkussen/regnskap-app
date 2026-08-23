# Oppgave 3 – test mot Excel-fasit

## Formål

Testpakken sammenligner beregningene i oppgave 3 med de uavhengige
Excel-resultatene i `Fasit/`. Fasitfilene dekker januar–mars 2026 og
budsjettversjon `2026B`. Oppgave 3 beregnes derfor på nytt for periode `202603`
under testen, selv om den operative rapporten viser en nyere periode.

Kjør:

```bash
npm run test:task3:fasit
```

Kommandoen returnerer feil dersom et fasittall ikke stemmer. Feilmeldingen
viser beregnet tall, fasittall og differansen i NOK.

## Testdekning

- periode og budsjettversjon;
- lønn, ADK og driftskostnader for finansiering `154301`;
- lønn, ADK og driftskostnader for hele Nkom;
- hovedbok, budsjett og avviksfortegn;
- at tallene som er publisert i oppgave 3 kan reproduseres fra operative kilder.

Foreløpige kontantlinjer for seksjon 712 holdes utenfor sammenligningen mot
kontogrupperingsfasiten. De har ikke et tilsvarende fasittall i `Fasit/`.
Workflowstatus og fakturakandidater kan heller ikke fasitkontrolleres med de
nåværende filene, fordi mappen ikke inneholder en godkjent workflowfasit.

## Tolkning

En bestått reproduksjonstest viser at rapportfilen er bygget konsistent fra
kildene. En bestått fasittest viser i tillegg at beregningsregelen gir samme
resultat som økonomis Excel-fasit. Dette er to forskjellige kontroller, og
begge er nødvendige.

## Testresultat etter retting

Kjøringen 23. juli 2026 består med 16 av 16 tester. Følgende regler ble rettet
for å oppnå samsvar:

- konto `6000–6109` inngår som avskrivninger i driftskostnader;
- hovedboksposter uten finansiering inngår i Nkom som `Uten finansiering`;
- avvik beregnes som budsjett minus hovedbok.

For fasitperioden stemmer dermed hovedbok, budsjett og avvik for de testede
lønn-, ADK- og driftskostnadstotalene innenfor en toleranse på 0,02 NOK.
