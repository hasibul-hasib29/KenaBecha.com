require("dotenv").config();
const express = require('express');
const app = express();
const path = require('path')
app.use(express.json()); // Parses JSON data
app.use(express.urlencoded({ extended: true })); // Parses URL-encoded form data
const {checkAuth} = require('./middlewares/auth')
const cookieParser = require("cookie-parser");
const userRoute = require("./routes/user");

const port = process.env.PORT;
const fs = require('fs');
const multer  = require('multer');

// Set view engine to EJS
app.set('view engine', 'ejs');
app.set("views", path.resolve("./views"));


// Serve static files (CSS, JS, images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(express.static('views'));
app.use(cookieParser()); 

// Route example
app.get('/', (req, res) => {
    res.render('home', { name: 'hasibul ' }); // Pass dynamic data to EJS
});
app.get('/signup', (req, res) => {
    res.render('signup'); // Render signup.ejs when /signup is requested
});
app.get('/login', (req, res) => {
    res.render('login'); // Render signup.ejs when /signup is requested
});
// app.get('/upload', (req, res) => {
//     res.render('upload'); // Render signup.ejs when /signup is requested
// });


// app.use("/", userRoute);
app.use("/", userRoute);
// Start server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
