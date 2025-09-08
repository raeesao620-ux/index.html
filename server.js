const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Mock database
let users = [];
let certificates = [];
let permits = [];

// Middleware to authenticate requests
const authenticateToken = (req, res, next) => {
  const token = req.header('Authorization').split(' ')[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, 'your_jwt_secret', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// User registration
app.post('/api/register', async (req, res) => {
  const { idNumber, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  users.push({ idNumber, password: hashedPassword });
  res.status(201).send('User registered');
});

// User login
app.post('/api/login', async (req, res) => {
  const { idNumber, password } = req.body;
  const user = users.find(u => u.idNumber === idNumber);
  if (user && await bcrypt.compare(password, user.password)) {
    const accessToken = jwt.sign({ idNumber: user.idNumber }, 'your_jwt_secret');
    res.json({ accessToken });
  } else {
    res.status(401).send('Invalid credentials');
  }
});

// Generate certificate
app.post('/api/certificates', authenticateToken, async (req, res) => {
  const { type, citizenId } = req.body;
  const certificate = { id: certificates.length + 1, type, status: 'issued', citizenId };
  certificates.push(certificate);
  res.status(201).json(certificate);
});

// Generate permit
app.post('/api/permits', authenticateToken, async (req, res) => {
  const { type, citizenId } = req.body;
  const permit = { id: permits.length + 1, type, status: 'issued', citizenId };
  permits.push(permit);
  res.status(201).json(permit);
});

// Verify certificate
app.get('/api/certificates/:id', authenticateToken, (req, res) => {
  const certificate = certificates.find(c => c.id === parseInt(req.params.id));
  if (certificate) {
    res.json(certificate);
  } else {
    res.status(404).send('Certificate not found');
  }
});

// Verify permit
app.get('/api/permits/:id', authenticateToken, (req, res) => {
  const permit = permits.find(p => p.id === parseInt(req.params.id));
  if (permit) {
    res.json(permit);
  } else {
    res.status(404).send('Permit not found');
  }
});

// Background check
app.get('/api/background-check/:idNumber', authenticateToken, async (req, res) => {
  const { idNumber } = req.params;
  try {
    const response = await axios.get(`https://api.gov.za/background-check/${idNumber}?key=YOUR_GOVERNMENT_API_KEY`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Error performing background check' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
