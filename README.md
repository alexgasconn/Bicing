# 🚲 BicingAI Barcelona

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-Live-green.svg)
![Language](https://img.shields.io/badge/idioma-Català-red.svg)

**BicingAI** és una aplicació d'última generació per visualitzar l'estat del servei de bicicletes compartides de Barcelona (Bicing) en temps real. Combina visualització de dades avançada i eines de planificació per al ciclista urbà.

## ✨ Característiques Principals

### 🧭 Radar de Trajecte (Smart Commute)
La joia de la corona. Planifica el teu viatge amb intel·ligència:
*   Selecciona **Origen (A)** i **Destí (B)** al mapa.
*   El sistema analitza en temps real si tens **bicis a l'origen** I **lloc per aparcar al destí**.
*   Et calcula la distància, el temps estimat i t'avisa amb un semàfor (Verd/Groc/Vermell) si la ruta és viable ara mateix.

### 🗺️ Visualització Avançada
*   **Mapa Interactiu:** Renderitzat fluid amb marcadors tipus "donut" que mostren el balanç elèctric/mecànic.
*   **Favorits:** Marca les estacions clau per tenir-les controlades.
*   **Optimització Mòbil:** Disseny compacte "thumb-friendly".

### 📊 Dades i Estadístiques
*   **Dashboard Flotant:** Resum en temps real de la flota total i espais lliures.
*   **Anàlisi Profunda:** Histogrames de disponibilitat i rànquings d'estacions (Top Bicis / Top Aparcament).

### 🔍 Filtres Potents
*   **Cerca per Radi:** Defineix un cercle al voltant teu (ex. 500m) i ignora la resta de la ciutat.
*   **Tipus de Bici:** Filtra només elèctriques si tens pressa o mecàniques si vols fer esport.

## 🛠️ Stack Tecnològic

*   **Core:** React 19 + TypeScript + Vite.
*   **Estat:** Custom React Hooks per a gestió eficient de dades.
*   **Mapes:** Leaflet + React-Leaflet.
*   **Estils:** Tailwind CSS.
*   **Gràfics:** Recharts.

## 🚀 Instal·lació i Ús

1.  Clona el repositori.
2.  Instal·la les dependències:
    ```bash
    npm install
    ```
3.  Inicia el servidor de desenvolupament:
    ```bash
    npm run dev
    ```

---
*Fet amb ❤️ pels ciclistes de Barcelona.*