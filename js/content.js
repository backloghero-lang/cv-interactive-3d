// Tresci strony (PL/EN). Zrodlo: CV Dariusza Maslyka. Telefon celowo pominiety.
export const PROFILE = {
  name: "Dariusz Masłyk",
  email: "d.maslyk@onet.eu",
  linkedin: "https://www.linkedin.com/in/dariusz-maslyk",
  github: "https://github.com/backloghero-lang",
  city: "Lublin"
};

const pl = {
  title: "Analityk biznesowo-systemowy",
  subtitle: "Aplikacje mobilne · Comarch ERP · Integracje · AI",
  enter: "Wejdź do pokoju",
  loading: "Urządzam pokój…",
  hint: "Przeciągnij, aby się rozejrzeć · kliknij świecące punkty",
  hintTouch: "Przesuń palcem, aby się rozejrzeć · zbliż dwoma palcami · dotknij punktów",
  close: "Zamknij",
  cv: "Pobierz CV",
  cvFile: "assets/cv-dariusz-maslyk-pl.pdf",
  textVersion: "Wersja tekstowa",
  day: "Dzień", night: "Noc", lampOn: "Zapal lampę", lampOff: "Zgaś lampę", soundOn: "Dźwięk włączony", soundOff: "Dźwięk wyłączony",
  hotspots: {
    desk: "Kontakt",
    wall: "Doświadczenie",
    tv: "Rynki na żywo",
    shelf: "Certyfikaty",
    console: "Projekty",
    board: "Umiejętności",
    hobby: "Po godzinach"
  },
  panels: {
    desk: {
      kicker: "Stanowisko pracy",
      title: "Dariusz Masłyk",
      lead: "Analityk biznesowo-systemowy specjalizujący się w projektowaniu aplikacji mobilnych zintegrowanych z systemami Comarch ERP. Prowadzę analizę od wymagań i koncepcji, przez dokumentację i współpracę z deweloperami, po testy projektanckie.",
      contact: [
        { label: "E-mail", key: "email" },
        { label: "LinkedIn", key: "linkedin" },
        { label: "GitHub", key: "github" },
        { label: "Miasto", key: "city" }
      ]
    },
    wall: {
      kicker: "Ściana wspomnień",
      title: "Doświadczenie zawodowe",
      jobs: [
        { co: "Comarch", logo: "comarch", years: "2022 – obecnie", role: "Analityk biznesowo-systemowy · Comarch Mobile",
          points: ["Zbieranie i analiza wymagań biznesowych oraz przekładanie ich na koncepcje rozwiązań i specyfikacje dla zespołu deweloperskiego.",
                   "Projektowanie funkcji aplikacji mobilnej: procesy w BPMN i UML, makiety UI/UX w Figmie, historyjki i kryteria akceptacji w Jira.",
                   "Analiza integracji z Comarch ERP (XL, Altum, Optima): REST API, SQL, JSON i XML, diagnostyka na podstawie logów.",
                   "Prowadzenie zmian od koncepcji do wydania: wsparcie implementacji, testy projektanckie i odbiór funkcji.",
                   "Wykorzystanie AI w pracy analityka: automatyzacja dokumentacji, zgłoszeń w Jira i zadań w Figmie.",
                   "Kilkadziesiąt zrealizowanych inicjatyw dla aplikacji z ponad 10 tys. licencji, m.in. promocje pakietowe i prolongaty, Asystent zamówień AI, telemetria aplikacji, powiązania oferta–zamówienie–faktura."] },
        { co: "ALDI Polska", logo: "aldi", years: "2021 – 2022", role: "Kierownik sklepu",
          points: ["Zarządzanie placówką i zespołem w oparciu o KPI sprzedażowe i operacyjne.",
                   "Planowanie grafików pracy, wdrażanie nowych pracowników i rozwój zespołu.",
                   "Kontrola dostaw z sieci i od dostawców zewnętrznych, stanów magazynowych i strat.",
                   "Dbałość o standardy sieci, ekspozycję towaru i jakość obsługi klienta."] },
        { co: "Grupa Kapitałowa SPECJAŁ", logo: "specjal", years: "2019 – 2021", role: "Kierownik zmiany",
          points: ["Koordynacja pracy zmiany w obszarze magazynowym: przyjęcia, kompletacja i wydania towaru.",
                   "Planowanie tras dostaw i rozliczanie kierowców z ich realizacji.",
                   "Prowadzenie dokumentacji logistycznej i magazynowej.",
                   "Dbałość o terminowość dostaw, porządek i bezpieczeństwo pracy na zmianie."] },
        { co: "Sklepy Komfort S.A.", logo: "komfort", years: "2019", role: "Zastępca kierownika salonu",
          points: ["Realizacja planów sprzedażowych salonu i doradztwo klientom przy wyborze produktów.",
                   "Obsługa zamówień i dokumentów sprzedażowych oraz kontakt z klientem do momentu dostawy.",
                   "Przygotowywanie akcji promocyjnych i ekspozycji w salonie.",
                   "Zastępowanie kierownika w organizacji pracy zespołu."] },
        { co: "Auchan Retail Polska", logo: "auchan", years: "2016 – 2018", role: "Manager",
          points: ["Zarządzanie działami sezonowymi: asortyment, zamówienia i ekspozycja.",
                   "Budżetowanie i kontrola wyników działu, z ciągłą progresją sprzedaży rok do roku.",
                   "Rekrutacja, szkolenie i rozwój zespołu.",
                   "Przygotowanie sklepu do kampanii sezonowych we współpracy z innymi działami."] }
      ]
    },
    tv: {
      kicker: "Kanał biznesowy",
      title: "Rynki na żywo",
      lead: "Na co dzień pracuję w Comarch nad aplikacją mobilną dla ponad 10 tys. użytkowników. Telewizor w tle to mój mały żart: serwis giełdowy, w którym Comarch zawsze rośnie razem z największymi firmami technologicznymi.",
      note: "Notowania na ekranie są fikcyjne i służą wyłącznie dekoracji."
    },
    shelf: {
      kicker: "Regał",
      title: "Certyfikaty i wykształcenie",
      certs: [["AI Academy", "2026"], ["UML: Modelowanie Systemów", "2025"], ["T-SQL: MS SQL Server", "2024"], ["BPMN: Modelowanie Procesów", "2023"], ["Inżynieria Wymagań", "2023"]],
      edu: "Magister filozofii, specjalizacja: logika — Katolicki Uniwersytet Lubelski, 2011"
    },
    console: {
      kicker: "Konsola",
      title: "Projekty po godzinach",
      lead: "Każdy kartridż to projekt zbudowany w parze z agentem AI — od analizy, przez projekt UI, po wdrożenie.",
      projects: [
        { name: "Bourbon Hunters", desc: "Mobilna aplikacja: zdjęcie butelki → AI rozpoznaje etykietę, zbiera opis, cenę i ocenę, wycina zdjęcie do wspólnego katalogu. PWA + Android.",
          links: [["Otwórz", "https://backloghero-lang.github.io/bourbon-hunters/"], ["Kod", "https://github.com/backloghero-lang/bourbon-hunters"]] },
        { name: "PokerHouse Trainer", desc: "Trener turniejowego pokera: silnik Nash + ICM w Pythonie, tabele push/fold, analiza rozdań i asystent AI.",
          links: [["Otwórz", "https://backloghero-lang.github.io/PokerHouse-Trainer/"], ["Kod", "https://github.com/backloghero-lang/PokerHouse-Trainer"]] },
        { name: "PriceShift", desc: "Wtyczka do przeglądarki: porównanie cen Allegro ↔ Amazon.pl jednym kliknięciem z dopasowaniem produktów przez AI.",
          links: [["Kod", "https://github.com/backloghero-lang/priceshift"]] }
      ]
    },
    board: {
      kicker: "Tablica",
      title: "Umiejętności",
      groups: [
        ["Analiza i projektowanie", ["Analiza wymagań biznesowych i systemowych", "Koncepcje rozwiązań i dokumentacja", "Modelowanie BPMN i UML", "Projektowanie UI/UX aplikacji mobilnych", "Testy projektanckie", "Agile / Scrum"]],
        ["Technologie", ["SQL / T-SQL / MS SQL Server", "REST API, logi, JSON, XML", "Comarch ERP: XL, Altum, Optima", "Jira, TFS, GitHub, Figma"]],
        ["AI w pracy analityka", ["ChatGPT, Claude, Gemini, NotebookLM", "Prompt engineering i proste agenty", "Automatyzacja: tworzenie dokumentacji, zgłoszeń w Jira i zadań w Figmie", "Prototypowanie koncepcji i makiet UI"]]
      ]
    },
    hobby: {
      kicker: "Po godzinach",
      title: "Podróże, eventy i dobre butelki",
      lead: "Poza pracą: podróże (Włochy skradły mi serce), eventy branżowe i odkrywanie bourbonu oraz whisky — stąd wziął się projekt Bourbon Hunters. A w domu rządzi beagle.",
      note: "Galeria zdjęć wkrótce."
    }
  }
};

const en = {
  title: "Business & Systems Analyst",
  subtitle: "Mobile apps · Comarch ERP · Integrations · AI",
  enter: "Enter the room",
  loading: "Setting up the room…",
  hint: "Drag to look around · click the glowing points",
  hintTouch: "Swipe to look around · pinch to zoom · tap the points",
  close: "Close",
  cv: "Download CV",
  cvFile: "assets/cv-dariusz-maslyk-en.pdf",
  textVersion: "Text version",
  day: "Day", night: "Night", lampOn: "Turn the lamp on", lampOff: "Turn the lamp off", soundOn: "Sound on", soundOff: "Sound off",
  hotspots: {
    desk: "Contact",
    wall: "Experience",
    tv: "Markets live",
    shelf: "Certificates",
    console: "Projects",
    board: "Skills",
    hobby: "After hours"
  },
  panels: {
    desk: {
      kicker: "Workstation",
      title: "Dariusz Masłyk",
      lead: "Business & systems analyst specialising in mobile applications integrated with Comarch ERP systems. I drive analysis from requirements and solution concepts, through documentation and work with developers, to design testing.",
      contact: [
        { label: "E-mail", key: "email" },
        { label: "LinkedIn", key: "linkedin" },
        { label: "GitHub", key: "github" },
        { label: "City", key: "city" }
      ]
    },
    wall: {
      kicker: "Memory wall",
      title: "Work experience",
      jobs: [
        { co: "Comarch", logo: "comarch", years: "2022 – present", role: "Business & Systems Analyst · Comarch Mobile",
          points: ["Gathering and analysing business requirements and turning them into solution concepts and specifications for the development team.",
                   "Designing mobile app features: BPMN and UML process models, UI/UX mock-ups in Figma, user stories and acceptance criteria in Jira.",
                   "Integration analysis with Comarch ERP (XL, Altum, Optima): REST API, SQL, JSON and XML, log-based diagnostics.",
                   "Driving changes from concept to release: implementation support, design testing and feature acceptance.",
                   "Using AI in analyst work: automated documentation, Jira tickets and Figma tasks.",
                   "Dozens of delivered initiatives for an app with over 10,000 licences, incl. bundle promotions and payment extensions, AI order assistant, app telemetry, offer–order–invoice links."] },
        { co: "ALDI Poland", logo: "aldi", years: "2021 – 2022", role: "Store Manager",
          points: ["Managed the store and team based on sales and operational KPIs.",
                   "Planned work schedules, onboarded new staff and developed the team.",
                   "Controlled deliveries from the chain and external suppliers, stock levels and losses.",
                   "Maintained chain standards, merchandising and customer service quality."] },
        { co: "SPECJAŁ Group", logo: "specjal", years: "2019 – 2021", role: "Shift Manager",
          points: ["Coordinated the shift in the warehouse area: goods receipt, picking and dispatch.",
                   "Planned delivery routes and settled drivers' route completion.",
                   "Maintained logistics and warehouse documentation.",
                   "Ensured on-time deliveries, order and safety on the shift."] },
        { co: "Komfort S.A.", logo: "komfort", years: "2019", role: "Deputy Store Manager",
          points: ["Delivered the store's sales targets and advised customers on product choice.",
                   "Handled orders and sales documents, staying in touch with customers until delivery.",
                   "Prepared promotional campaigns and in-store displays.",
                   "Deputised for the store manager in organising the team's work."] },
        { co: "Auchan Retail Poland", logo: "auchan", years: "2016 – 2018", role: "Manager",
          points: ["Managed seasonal departments: assortment, orders and merchandising.",
                   "Budgeted and monitored department results, with year-on-year sales growth.",
                   "Recruited, trained and developed the team.",
                   "Prepared the store for seasonal campaigns together with other departments."] }
      ]
    },
    tv: {
      kicker: "Business channel",
      title: "Markets live",
      lead: "Day to day I work at Comarch on a mobile app used by over 10,000 users. The TV is my little joke: a stock news show where Comarch always rises together with the biggest tech companies.",
      note: "Quotes on the screen are fictional and purely decorative."
    },
    shelf: {
      kicker: "Shelf",
      title: "Certificates & education",
      certs: [["AI Academy", "2026"], ["UML: Systems Modelling", "2025"], ["T-SQL: MS SQL Server", "2024"], ["BPMN: Process Modelling", "2023"], ["Requirements Engineering", "2023"]],
      edu: "Master of Philosophy, specialisation: logic — John Paul II Catholic University of Lublin, 2011"
    },
    console: {
      kicker: "Console",
      title: "Side projects",
      lead: "Every cartridge is a project built together with an AI agent — from analysis and UI design to deployment.",
      projects: [
        { name: "Bourbon Hunters", desc: "Mobile app: snap a bottle → AI reads the label, gathers description, price and rating, and cuts out the photo into a shared catalogue. PWA + Android.",
          links: [["Open", "https://backloghero-lang.github.io/bourbon-hunters/"], ["Code", "https://github.com/backloghero-lang/bourbon-hunters"]] },
        { name: "PokerHouse Trainer", desc: "Tournament poker trainer: Nash + ICM engine in Python, push/fold charts, hand analysis and an AI assistant.",
          links: [["Open", "https://backloghero-lang.github.io/PokerHouse-Trainer/"], ["Code", "https://github.com/backloghero-lang/PokerHouse-Trainer"]] },
        { name: "PriceShift", desc: "Browser extension: one-click Allegro ↔ Amazon.pl price comparison with AI product matching.",
          links: [["Code", "https://github.com/backloghero-lang/priceshift"]] }
      ]
    },
    board: {
      kicker: "Board",
      title: "Skills",
      groups: [
        ["Analysis & design", ["Business and system requirements analysis", "Solution concepts and documentation", "BPMN and UML modelling", "Mobile UI/UX design", "Design testing", "Agile / Scrum"]],
        ["Technology", ["SQL / T-SQL / MS SQL Server", "REST API, logs, JSON, XML", "Comarch ERP: XL, Altum, Optima", "Jira, TFS, GitHub, Figma"]],
        ["AI in analyst work", ["ChatGPT, Claude, Gemini, NotebookLM", "Prompt engineering and simple agents", "Automation: documentation, Jira tickets and Figma tasks", "Concept and UI mock-up prototyping"]]
      ]
    },
    hobby: {
      kicker: "After hours",
      title: "Travel, events and good bottles",
      lead: "Outside work: travel (Italy stole my heart), industry events and discovering bourbon and whisky — which is how Bourbon Hunters was born. And at home, the beagle is in charge.",
      note: "Photo gallery coming soon."
    }
  }
};

export const TEXT = { pl: pl, en: en };
