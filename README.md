# 🚲 BicingAI Barcelona

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-Live-green.svg)
![Language](https://img.shields.io/badge/idioma-Català-red.svg)

**BicingAI** és una aplicació d'última generació per visualitzar l'estat del servei de bicicletes compartides de Barcelona (Bicing) en temps real. Combina visualització de dades avançada i eines de planificació per al ciclista urbà.

## ✨ Característiques Principals

### 🧭 Radar de Trajecte (Smart Commute)

La joia de la corona. Planifica el teu viatge amb intel·ligència:

* Selecciona **Origen (A)** i **Destí (B)** al mapa.
* El sistema analitza en temps real si tens **bicis a l'origen** I **lloc per aparcar al destí**.
* Et calcula la distància, el temps estimat i t'avisa amb un semàfor (Verd/Groc/Vermell) si la ruta és viable ara mateix.

### 📈 Analítica i Predicció Avançada

* **Predicció a 3 Hores:** Algoritme local que projecta la disponibilitat futura basant-se en l'històric.
* **Patrons de 30 minuts:** Analitza quan s'omple o es buida cada estació amb precisió de mitja hora.
* **Històric Local:** Utilitza IndexedDB per guardar dades al teu navegador i aprendre dels patrons de la ciutat sense necessitat de servidors externs.

### 🗺️ Visualització Optimitzada

* **Mapa d'Alt Rendiment:** Renderitzat amb Canvas per gestionar centenars de marcadors sense alentir el dispositiu.
* **Marcadors Informatius:** Gràfics tipus "donut" que mostren el balanç elèctric/mecànic d'un cop d'ull.
* **Disseny Mòbil:** Interfície compacte pensada per ser utilitzada amb una sola mà al carrer.
* **Càrrega Més Lleugera:** Els panells analítics pesants es carreguen sota demanda per accelerar l'arrencada en Android.

### 📲 PWA Instal·lable

* **Manifest + Service Worker:** Instal·lable des d'Android i Windows com a app independent.
* **Accessos Ràpids:** El manifest inclou dreceres per obrir "A prop meu" i el radar de trajecte.
* **Caché Intel·ligent:** Es cachegen recursos clau, dades del mapa i el manifest per fer la reobertura més ràpida.

### 📊 Dades i Estadístiques Globals

* **Dashboard Flotant:** Resum en temps real de la flota total i espais lliures.
* **Anàlisi de Xarxa:** Histogrames de disponibilitat, rànquings d'estacions (Top Bicis / Top Aparcament) i salut del servei.

## 🛠️ Stack Tecnològic

* **Core:** React 19 + TypeScript + Vite.
* **Estat:** Custom React Hooks per a gestió eficient de dades.
* **Mapes:** Leaflet + React-Leaflet (amb optimització `preferCanvas`).
* **Dades:** IndexedDB per a l'emmagatzematge persistents d'històric.
* **Estils:** Tailwind CSS.
* **Gràfics:** Recharts.

## 🚀 Instal·lació i Ús

1. Clona el repositori.
2. Instal·la les dependències:

    ```bash
    npm install
    ```

3. Inicia el servidor de desenvolupament:

    ```bash
    npm run dev
    ```

---
*Fet amb ❤️ pels ciclistes de Barcelona.*
