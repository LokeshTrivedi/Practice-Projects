const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const port = 3000;

mongoose.connect('mongodb://localhost:27017', { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

const userSchema = new mongoose.Schema({
    fullname: String,
    email: String,
    username: String,
    password: String,
    mobile: String,
});

const User = mongoose.model('User', userSchema);

const loginDetailSchema = new mongoose.Schema({
    username: String,
    systemInfo: String,
    ipAddress: String,
    timestamp: { type: Date, default: Date.now }
  });
  
  const LoginDetail = mongoose.model('LoginDetail', loginDetailSchema);
  

app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ secret: 'your-secret-key', resave: true, saveUninitialized: true }));
app.use(express.static(path.join(__dirname, '/')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});


app.post('/signup', async (req, res) => {
    const { fullname, email, username, password, mobile } = req.body;
  
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
  
      const newUser = new User({
        fullname,
        email,
        username,
        password: hashedPassword,
        mobile,
      });
  
      await newUser.save();
      res.redirect('/login.html');
    } catch (error) {
      console.error(error);
      res.send('Error during signup');
    }
  });
  

// app.post('/login', async (req, res) => {
//   const { 'phone-email': username, password } = req.body;

//   try {
//     const user = await User.findOne({ username });

//     if (user && (await bcrypt.compare(password, user.password))) {
//       req.session.user = user;
//       res.redirect('/dashboard');
//     } else {
//       res.send('Invalid login credentials');
//     }
//   } catch (error) {
//     res.send('Error during login');
//   }
// });

app.post('/login', async (req, res) => {
    const { 'phone-email': identifier, password } = req.body;
    const systemInfo = req.headers['user-agent']; // Extract system info from request headers
    const ipAddress = req.connection.remoteAddress; // Extract IP address from request
    const isEmail = (input) => {
        // A simple function to check if the input is an email address
        // This is a basic validation and may not cover all cases
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(input);
      };
  
    try {
      let user;
  
      if (isEmail(identifier)) {
        // If '@' is present, treat it as an email address
        user = await User.findOne({ email: identifier });
      } else {
        // Otherwise, treat it as a username
        user = await User.findOne({ username: identifier });
      }
  
      if (user && (await bcrypt.compare(password, user.password))) {
        // Save login details to a separate collection
        const loginDetail = new LoginDetail({
          username: user.username,
          systemInfo,
          ipAddress,
        });
  
        await loginDetail.save();
  
        req.session.user = user;
        res.redirect('/dashboard');
      } else {
        res.send('Invalid login credentials');
      }
    } catch (error) {
      console.error(error);
      res.send('Error during login');
    }
  });

  
  


app.get('/dashboard', (req, res) => {
  if (req.session.user) {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
  } else {
    res.redirect('/login');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
