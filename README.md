# 🚗 Road Trip Planner

## ✨ Features

- **Route Planning**: Define your origin and destination, and add multiple stops along the way.
- **Smart Search**: Integrated place search to easily find and add locations to your trip.
- **Route Visualization**: Automatic calculation of distances, durations, and routes.
- **Checklists**: Keep track of packing lists and tasks for each trip.

## 🛠️ Getting Started

### Prerequisites

- Node.js 22+
- pnpm
- Docker (for local database)

### Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/MaksimZadar/road-trip.git
   cd road-trip
   ```

2. **Install dependencies**:

   ```bash
   pnpm install
   ```

3. **Set up environment variables**:
   Create a `.env` file in the root directory:

   ```env
   DATABASE_URL=postgres://root:mysecretpassword@localhost:5432/local
   OPENROUTE_API_KEY=your_api_key_here
   OPENTRIPMAP_API_KEY=your_api_key_here
   ```

4. **Start the database**:

   ```bash
   pnpm db:start
   ```

5. **Push database schema**:

   ```bash
   pnpm db:push
   ```

6. **Run the development server**:
   ```bash
   pnpm dev
   ```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## 🐳 Docker Support

You can also run the entire application using Docker Compose:

```bash
docker compose up -d
```

Compose reads `OPENROUTE_API_KEY` from your shell or from a `.env` file next to `compose.yaml`, so set it there before starting (e.g. `OPENROUTE_API_KEY=your_api_key_here`). Do not commit real keys.

`OPENTRIPMAP_API_KEY` is optional. It enables the "things to do" suggestions (free key at [opentripmap.io](https://opentripmap.io/product)). Without it the feature is disabled. Attribution: place data is provided by [OpenTripMap](https://opentripmap.io) (data © OpenStreetMap contributors, Wikidata and Wikipedia where applicable, licensed ODbL). Keep this attribution wherever OpenTripMap data is shown.

The app will be available at [http://localhost:3000](http://localhost:3000).

## 📄 License

MIT
