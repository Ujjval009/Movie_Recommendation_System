<div align="center">
  <br/>
  <img src="https://img.shields.io/badge/Python-3.9+-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python"/>
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React"/>
  <img src="https://img.shields.io/badge/FastAPI-0.111-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/Streamlit-1.36-FF4B4B?style=for-the-badge&logo=streamlit&logoColor=white" alt="Streamlit"/>
  <img src="https://img.shields.io/badge/scikit--learn-1.5-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white" alt="scikit-learn"/>
  <br/><br/>
  <h1>🎬 Movie Recommendation System</h1>
  <p>
    <strong>Content-Based Filtering · TF-IDF · Cosine Similarity · TMDB API</strong>
  </p>
  <p>
    A full-stack movie discovery platform that recommends films based on plot similarity, genre overlap, and real-time TMDB data.
  </p>
  <br/>
  <p>
    <a href="#-features">Features</a> •
    <a href="#-tech-stack">Tech Stack</a> •
    <a href="#-architecture">Architecture</a> •
    <a href="#-installation">Installation</a> •
    <a href="#-usage">Usage</a> •
    <a href="#-api-reference">API Reference</a>
  </p>
  <br/>
</div>

---

## ✨ Features

| Feature                                 | Description                                                                          |
| --------------------------------------- | ------------------------------------------------------------------------------------ |
| **🧠 AI-Powered Recommendations** | TF-IDF vectorization + Cosine Similarity on movie overviews with genre overlap boost |
| **🎭 Genre-Based Discovery**      | Find movies in similar genres using TMDB's discovery API as fallback                 |
| **🔍 Smart Search**               | Real-time search with autocomplete suggestions and debounced TMDB queries            |
| **🏠 Curated Home Feed**          | Trending, Top Rated, Now Playing, Popular, and Upcoming categories                   |
| **🖼️ Rich Movie Details**       | Posters, backdrops, ratings, release dates, genres, and full overviews               |
| **📱 Responsive UI**              | Dark-themed React frontend optimized for desktop, tablet, and mobile                 |
| **⚡ Dual Backend Mode**          | Uses cloud TMDB API when available; falls back to local placeholder posters          |
| **🎨 SVG Placeholder Posters**    | Auto-generated gradient posters for movies missing TMDB images                       |

---

## 🛠️ Tech Stack

### Frontend

| Technology                      | Purpose                                                  |
| ------------------------------- | -------------------------------------------------------- |
| **React 18**              | UI framework with hooks and functional components        |
| **React Router 6**        | Client-side routing (`/`, `/movie/:id`, `/search`) |
| **Vite 5**                | Fast dev server and optimized production builds          |
| **CSS Custom Properties** | Dark theme with CSS variables and responsive design      |

### Backend

| Technology               | Purpose                                                  |
| ------------------------ | -------------------------------------------------------- |
| **Python 3.9+**    | Core processing language                                 |
| **FastAPI**        | High-performance async REST API with auto-generated docs |
| **Uvicorn**        | ASGI server for production deployment                    |
| **scikit-learn**   | TF-IDF vectorization and cosine similarity computation   |
| **Pandas / NumPy** | Data manipulation and numerical processing               |
| **httpx**          | Async HTTP client for TMDB API calls                     |
| **Pydantic**       | Request/response validation with type hints              |

### Machine Learning

| Technique                      | Application                                               |
| ------------------------------ | --------------------------------------------------------- |
| **TF-IDF Vectorization** | Converts movie overviews into numerical feature vectors   |
| **Cosine Similarity**    | Measures pairwise similarity between movie vectors        |
| **NLP Preprocessing**    | Text cleaning, stop word removal, and vocabulary building |
| **Genre Overlap Boost**  | Adds +0.15 similarity score per shared genre word         |

### Data

| Source                          | Description                                                         |
| ------------------------------- | ------------------------------------------------------------------- |
| **TMDB API**              | Real-time movie metadata, posters, backdrops, search, and discover  |
| **Movies Metadata (CSV)** | ~42K movie records from Kaggle for offline TF-IDF computation       |
| **Pickle Files**          | Pre-computed TF-IDF matrix, indices, and DataFrame for fast startup |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Browser (React)                    │
│  ┌──────────┐ ┌──────────┐ ┌────────────────────┐   │
│  │ HomePage │ │ MovieDetail│ │ SearchResultsPage │   │
│  └────┬─────┘ └────┬─────┘ └─────────┬──────────┘   │
│       │            │                 │               │
│  ┌────▼────────────▼─────────────────▼──────────┐   │
│  │            movieApi.js (Fetch API)            │   │
│  │  API_BASE → https://movie-rec-466x.onrender.com │ │
│  └────────────────────┬─────────────────────────┘   │
└───────────────────────┼─────────────────────────────┘
                        │ HTTPS
┌───────────────────────▼─────────────────────────────┐
│              FastAPI Backend (Render)                │
│  ┌──────────────────────────────────────────────┐   │
│  │              REST API Endpoints              │   │
│  │  /home  /movie/id  /movie/search  /tmdb/search│   │
│  │  /recommend/genre  /recommend/tfidf  /health │   │
│  └────────────────────┬─────────────────────────┘   │
│                       │                              │
│  ┌────────────────────┼─────────────────────────┐   │
│  │         ┌──────────▼──────────┐               │   │
│  │         │   TMDB API          │  🌐 External  │   │
│  │         │  (api.themoviedb.org)│               │   │
│  │         └─────────────────────┘               │   │
│  │         ┌─────────────────────┐               │   │
│  │         │  Pickle Files       │  💾 Local     │   │
│  │         │  df.pkl, tfidf.pkl  │               │   │
│  │         │  indices.pkl, etc   │               │   │
│  │         └─────────────────────┘               │   │
│  └───────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Data Flow

1. **Frontend** sends HTTP requests to the FastAPI backend via `movieApi.js`
2. **Backend** either queries the **TMDB API** (real-time data) or uses **local pickle files** (TF-IDF computation)
3. **Recommendations** combine TF-IDF cosine similarity scores with a genre overlap boost
4. **Posters & backdrops** are served from TMDB's CDN (`image.tmdb.org`) or generated as SVG placeholders

---

## 📦 Installation

### Prerequisites

- Python 3.9+
- Node.js 18+
- npm 9+
- TMDB API key ([get one free](https://www.themoviedb.org/settings/api))

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/Movie_Recommendation_System.git
cd Movie_Recommendation_System
```

### 2. Backend Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate   # Linux/Mac
# venv\Scripts\activate    # Windows

# Install dependencies
pip install -r requirements.txt
pip install fastapi uvicorn httpx python-dotenv

# Create .env file with your TMDB API key
echo "TMDB_API_KEY=your_api_key_here" > .env
```

### 3. Frontend Setup

```bash
cd frontend
npm install
cd ..
```

### 4. Data Files

The project expects these pickle files in the root directory:

- `df.pkl` — DataFrame with movie data
- `indices.pkl` — Title-to-index mapping
- `tfidf_matrix.pkl` — Pre-computed TF-IDF matrix
- `tfidf.pkl` — Fitted TF-IDF vectorizer

These are generated by the Jupyter notebook (`movies.ipynb`).

---

## 🚀 Usage

### Run Locally (Full Stack)

**Terminal 1 — Backend:**

```bash
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend:**

```bash
cd frontend
VITE_API_URL=http://localhost:8000 npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Run Locally (React → Production Backend)

```bash
cd frontend
npm run dev
# Uses https://movie-rec-466x.onrender.com by default
```

### Production Build

```bash
cd frontend
npm run build
npm run preview
```

### Streamlit UI (Alternative)

```bash
streamlit run app.py
```

---

## 📡 API Reference

The backend exposes the following REST endpoints. Full interactive docs at `/docs` when running locally.

### Movies

| Endpoint                | Method | Description                    | Parameters                                                                |
| ----------------------- | ------ | ------------------------------ | ------------------------------------------------------------------------- |
| `/home`               | GET    | Curated home feed by category  | `category` (trending/top_rated/popular/now_playing/upcoming), `limit` |
| `/movie/id/{tmdb_id}` | GET    | Detailed movie information     | `tmdb_id` (path)                                                        |
| `/movie/search`       | GET    | Search + TF-IDF + Genre bundle | `query`, `tfidf_top_n`, `genre_limit`                               |
| `/tmdb/search`        | GET    | TMDB search with autocomplete  | `query`, `page`                                                       |

### Recommendations

| Endpoint             | Method | Description               | Parameters             |
| -------------------- | ------ | ------------------------- | ---------------------- |
| `/recommend/tfidf` | GET    | TF-IDF content-based recs | `title`, `top_n`   |
| `/recommend/genre` | GET    | Genre-based discovery     | `tmdb_id`, `limit` |

### Utilities

| Endpoint            | Method | Description                                     |
| ------------------- | ------ | ----------------------------------------------- |
| `/health`         | GET    | Health check (returns TMDB connectivity status) |
| `/poster/{title}` | GET    | SVG placeholder poster for missing images       |

### Example Response

```json
GET /movie/id/603

{
  "tmdb_id": 603,
  "title": "The Matrix",
  "overview": "Set in the 22nd century, The Matrix tells the story of...",
  "release_date": "1999-03-31",
  "poster_url": "https://image.tmdb.org/t/p/w500/aOIuZAjPaRIE6CMzbazvcHuHXDc.jpg",
  "backdrop_url": "https://image.tmdb.org/t/p/w500/tlm8UkiQsitc8rSuIAscQDCnP8d.jpg",
  "genres": [
    { "id": 28, "name": "Action" },
    { "id": 878, "name": "Science Fiction" }
  ]
}
```

---

## 📁 Project Structure

```
Movie_Recommendation_System/
│
├── frontend/                     # React application
│   ├── public/                   # Static assets
│   ├── src/
│   │   ├── api/
│   │   │   └── movieApi.js       # API client (all endpoints)
│   │   ├── components/
│   │   │   ├── Navbar.jsx        # Top navigation + search
│   │   │   ├── MovieCard.jsx     # Movie poster card
│   │   │   ├── MovieGrid.jsx     # Responsive grid layout
│   │   │   ├── Loader.jsx        # Skeleton loading state
│   │   │   └── Footer.jsx        # Page footer
│   │   ├── pages/
│   │   │   ├── HomePage.jsx      # Categories + movie grid
│   │   │   ├── MovieDetailPage.jsx # Details + recs
│   │   │   └── SearchResultsPage.jsx # Search results
│   │   ├── styles/
│   │   │   └── global.css        # Dark theme CSS
│   │   ├── App.jsx               # Router + layout
│   │   └── main.jsx              # Entry point
│   ├── index.html
│   ├── vite.config.js            # Vite config + proxy
│   └── package.json
│
├── main.py                       # FastAPI backend (778 lines)
├── app.py                        # Streamlit UI (optional)
├── movies.ipynb                  # EDA + model training notebook
│
├── df.pkl                        # Processed movie DataFrame
├── indices.pkl                   # Title→index mapping
├── tfidf_matrix.pkl              # TF-IDF sparse matrix
├── tfidf.pkl                     # Fitted vectorizer
│
├── Data/
│   └── movies_metadata.csv       # Kaggle movie dataset
│
├── requirements.txt              # Python dependencies
├── .env                          # TMDB API key (create this)
└── README.md
```

---

## 📸 Screenshots

### Output Image

<img src="output/image.png" alt="Movie Recommendation System Demo" width="100%"/>

| Page                   | Description                                                                       |
| ---------------------- | --------------------------------------------------------------------------------- |
| **Home**         | Curated category carousels with movie posters                                     |
| **Movie Detail** | Full movie info with backdrop, poster, overview, and dual recommendation sections |
| **Search**       | Real-time autocomplete with debounced TMDB queries                                |

---

## 🧪 How Recommendations Work

### Content-Based Filtering with TF-IDF

```
┌──────────┐    ┌──────────────────┐    ┌──────────────┐
│  Movie   │───→│  TF-IDF Vector   │───→│  Cosine      │
│ Overview │    │  (scikit-learn)  │    │  Similarity  │
└──────────┘    └──────────────────┘    └──────┬───────┘
                                               │
                                     ┌─────────▼─────────┐
                                     │  Score × Genre     │
                                     │  Boost (+0.15 per  │
                                     │  shared genre)     │
                                     └─────────┬─────────┘
                                               │
                                     ┌─────────▼─────────┐
                                     │  Ranked Results    │
                                     │  + TMDB Metadata   │
                                     └───────────────────┘
```

1. **Text Preprocessing**: Movie overviews are cleaned and tokenized
2. **TF-IDF Vectorization**: Each overview becomes a sparse numerical vector
3. **Cosine Similarity**: Pairwise similarity scores are computed between all movies
4. **Genre Boost**: +0.15 is added to the score for each overlapping genre keyword
5. **TMDB Enrichment**: Top results are merged with TMDB metadata (posters, ratings, etc.)

---

## 🔮 Future Improvements

- [ ] **User Authentication** — Save favorites, watchlist, and rating history
- [ ] **Collaborative Filtering** — Matrix factorization using user rating patterns
- [ ] **Hybrid Recommender** — Combine content-based + collaborative approaches
- [ ] **Personalized Feed** — ML-driven ranking based on user behavior
- [ ] **Infinite Scroll** — Lazy-loaded movie grids with pagination
- [ ] **Dark/Light Toggle** — Theme switcher with persisted preference
- [ ] **PWA Support** — Offline caching and installable web app
- [ ] **Unit Tests** — Backend pytest + frontend Vitest coverage
- [ ] **Docker Compose** — One-command setup for the entire stack
- [ ] **CI/CD Pipeline** — Automated testing and deployment via GitHub Actions

---

<<<<<<< HEAD



## 📄 License

This project is licensed under the **MIT License** 


=======
---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
>>>>>>> d2642f3 ( FINAL README FILE)
