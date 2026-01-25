# TYNDA — Music Streaming API (Assignment 3 Part 1)

## About the Project
This is the backend update for our **TYNDA** music streaming project. 
For **Assignment 3 (Part 1)**, we have migrated the database from SQLite to **MongoDB** and implemented a full RESTful API with advanced query features.

---

## Important Changes for the Team (Read This!)

we have refactored the project structure to meet the new assignment requirements. Here is what changed from Assignment 2:

1.  **Database Migration:** * Removed **SQLite** (`database.sqlite`).
    * Added **MongoDB** (Native Driver). The database name is `tynda_music`.
    * Data is now stored in a collection called `tracks`.

2.  **Folder Structure:**
    * Moved database connection logic to `database/db.js`.
    * Moved all API routes to `routes/tracks.js` (cleaner code).
    * `server.js` is now much smaller and only handles configuration.

3.  **New API Features:**
    * Added **Filtering** (find by artist or title).
    * Added **Sorting** (sort by title or date).
    * Added **Projection** (select specific fields).

---

## 🚀 Setup Instructions

Since we added new dependencies:

1.  **Install Dependencies:**
    ```bash
    npm install
    ```
    *(This installs `mongodb` and `express`)*

2.  **Start MongoDB:**
    MongoDB server is running on port `27017`.

3.  **Run the Server:**
    ```bash
    node server.js
    ```
    The server will start at: `http://localhost:3009`

---

## 🛠 API Documentation

We now have a full CRUD API. Here is how to use it:

### 1. Get All Tracks (Read)
**Endpoint:** `GET /api/tracks`

You can use query parameters to filter and sort:
* **Filter by Artist:** `?artist=Eminem`
* **Sort by Title:** `?sortBy=title` (A-Z)
* **Sort by Date:** `?sortBy=date` (Newest first)
* **Select Fields (Projection):** `?fields=title,artist`

**Example:**
`http://localhost:3009/api/tracks?artist=Drake&sortBy=title`

### 2. Get Single Track (Read)
**Endpoint:** `GET /api/tracks/:id`

### 3. Create Track (Create)
**Endpoint:** `POST /api/tracks`
* **Body (JSON):**
    ```json
    {
      "title": "Shape of You",
      "artist": "Ed Sheeran",
      "album": "Divide",
      "durationSeconds": 233
    }
    ```

### 4. Update Track (Update)
**Endpoint:** `PUT /api/tracks/:id`

### 5. Delete Track (Delete)
**Endpoint:** `DELETE /api/tracks/:id`

---

## Project Structure

```text
/
├── database/
│   └── db.js            # MongoDB connection (Native Driver)
├── routes/
│   └── tracks.js        # All CRUD logic 
├── public/              
│   ├── index.html       
│   ├── tracks.html      
│   └── style.css        
├── server.js            # Entry point (Middleware & Setup)
└── README.md            