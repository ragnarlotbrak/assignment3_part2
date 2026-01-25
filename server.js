const express = require('express');
const path = require('path');
const { connectToDb } = require('./database/db-mongodb'); 

const tracksRouter = require('./routes/tracks');

const app = express();
const PORT = process.env.PORT || 3009;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.use('/api/tracks', tracksRouter);

// HTML Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'public', 'about.html')));
app.get('/contact', (req, res) => res.sendFile(path.join(__dirname, 'public', 'contact.html')));
app.get('/tracks', (req, res) => res.sendFile(path.join(__dirname, 'public', 'tracks.html')));

// 404 Handler
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public', '404.html')));

//post
app.post('/contact', (req, res) => {
  const { name, email, message } = req.body;

  console.log('Contact form:', name, email, message);

  res.send(`
    <h2>Thank you, ${name}!</h2>
    <p>Your message has been received.</p>
    <a href="/">Back to home</a>
  `);
});

// run
connectToDb().then(() => {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
});