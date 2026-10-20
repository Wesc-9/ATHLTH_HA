# ATHLTH_HA — praktisk installasjonstest

Denne sjekklisten må gjennomføres på en **ekte Home Assistant-installasjon** før vi
publiserer ATHLTH_HA som produksjonsklar. Automatiske tester erstatter ikke
iPhone-, Apple Watch- og nettlesertestene.

## Før HACS-release

1. Åpne [ATHLTH_HA-repositoryet](https://github.com/Wesc-9/ATHLTH_HA).
   Under **About → tannhjul → Topics**, legg til
   `home-assistant`, `hacs`, `fitness` (og eventuelt `athlth`).
   GitHub-topics er **metadata for repositoryet**, ikke filer som kan
   endres med en commit. HACS krever at repositoryet har topics.
2. Kontroller at alle seks testjobber blir grønne på siste commit.
   Ingen `ignore: topics` eller tilsvarende omgåelse av validering.
3. Kontroller at faktisk frontend- og mobiltesting nedenfor er bestått.
4. Først deretter: avklar versjonsnummer, oppdater integrasjonens
   `manifest.json` og lag en **GitHub Release**. En commit alene
   oppdaterer ikke installasjoner som bruker en tidligere release.

## Frontend og første oppstart

- Installer den aktuelle utviklingsutgaven av `custom_components/athlth`
  i en separat HA-testinstallasjon, og start Home Assistant på nytt.
- Åpne **Innstillinger → Enheter og tjenester → ATHLTH**. Bekreft
  at sensorer opprettes uten feil i logger.
- Verifiser at `/athlth/frontend/athlth-cards.js` lastes uten 404
  i nettleseren. Den inneholder ingen persondata.
- Opprett et dashboard med `custom:athlth-dashboard-card` fra
  `examples/premium-dashboard.yaml`.
- Kortpakken blir forsøkt registrert automatisk. Hvis kortene viser
  `Custom element doesn't exist` ved første innlasting, gå til
  **Innstillinger → Dashboards → meny → Ressurser**, kontroller om
  `/athlth/frontend/athlth-cards.js` allerede ligger der, og legg
  til denne URL-en som **JavaScript module** hvis den mangler.
  Last siden inn på nytt. Ikke legg inn to like ressurser.
- Test med tom konto og med utfylte data. Ingen verdier skal gjettes.
  Test i mobilvisning og desktop, samt etter en helt fersk innlasting
  (uten tidligere nettlesercache).

## Online / Trener nå / frakoblet

- I ATHLTH på iPhone: koble til HA, aktiver **Online-status**.
  Åpne appen: grønn `Online` skal vises når synk er fersk.
- Legg appen i bakgrunnen: kortet skal vise nøytral `Offline` når
  den oppdateringen mottas. Uten ny synk innen omtrent fire minutter
  skal status bli `Ukjent`, ikke fortsette å være grønn.
- Start en virkelig løpe- eller styrkeøkt og bekreft gullfarget
  `Trener nå` samt korrekt øktnavn. Kontroller spesielt en økt
  startet på **Apple Watch**, med iPhone i bakgrunnen.
- Avslutt økten: `Trener nå` må forsvinne ved neste gyldige
  hendelse. Simuler manglende tilkobling: gammel økt må ikke vises
  som aktiv etter fire minutter.
- Slå av statusdeling på iPhone: `Ikke delt` skal erstatte
  personens online-status. En sammenkoblet app er **ikke** lik
  en online person.
- Koble til to ulike appinstallasjoner med separat samtykke.
  Familieoversikten skal vise riktig markering og antall per medlem
  uten at statusene blandes sammen.

## Treningsplan, historikk og personvern

- Kalender skal vise planlagte, fullførte og hoppede økter korrekt.
  Ekstraøkt skal ikke telle som en planlagt økt.
- Kontroller siste økt for **utendørs**, **tredemølle** og
  **styrke**. GPS-kart kun når kartbildet tilhører riktig utendørsøkt.
- Sjekk deling av restitusjon og HRV individuelt for hvert medlem.
  Skru av samtykke til fullførte økter: historikk og kart skal
  fjernes fra aktiv tilstand; sjekk også at det ikke kommer tilbake
  etter omstart av HA.
- Vær oppmerksom på at **Home Assistant Recorder-historikk** kan
  bevare tidligere sensortilstander. Krever særskilt sletting i HA,
  og dashboardet er ikke en sikkerhetsgrense mellom husstandsbrukere.

## Signering før release

- Dokumenter dato, HA-versjon, ATHLTH iOS/Watch-versjon, testresultater,
  og eventuelle avvik.
- Ikke kjør TestFlight eller publiser HACS-release uten eksplisitt klarsignal.
