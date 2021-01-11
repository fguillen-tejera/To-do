const express = require('express');
const bodyParser = require('body-parser');
const date = require(__dirname + '/date.js');
const mongoose = require('mongoose');
const { response } = require('express');
const env = require('dotenv').config();
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
    secret: 'Our little Secret.',
    resave: false,
    saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb+srv://admin-fer:Test123@cluster0.tlrmk.mongodb.net/todolistDB', {useNewUrlParser:true});
mongoose.set('useCreateIndex',true);

const day = date.getDate();
const itemsSchema = {
    name: String
};

const Item =  mongoose.model('item', itemsSchema);

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    items: [itemsSchema]
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model('User', userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done){
    done(null, user.id);
});

passport.deserializeUser(function(id, done){
    User.findById(id, function(err, user){
        done(err,user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: 'http://localhost:3000/auth/google/list',
    userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo'
}, 
function(accesToke, refreshToken, profile, cb){
    User.findOrCreate({username: profile.id}, function(err, user){
        return cb(err, user);
    });
}));

app.get('/', function(req,res){
    res.render('landing');
});

app.get("/auth/google", passport.authenticate('google', {
    scope: ['profile']
}));



app.get('/auth/google/list',
    passport.authenticate('google', {failureRedirect: '/login'}),
    function(req,res){
        res.redirect('/list'); 
});

app.get('/login',function(req,res){
    res.render('login');
});


app.post("/register", function(req, res){

    User.register({username: req.body.username}, req.body.password, function(err, user){
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, function(){
          res.redirect("/list");
        });
      }
    });
  
  });
  
  app.post("/login", function(req, res){

    const user = new User({
      username: req.body.username,
      password: req.body.password
    });
  
    req.login(user, function(err){
      if (err) {
        console.log(err);
      } else {
        passport.authenticate("local", { failureRedirect: '/login'})(req, res, function(){
          res.redirect("/list");
        });
      }
    });
  
  });
  


app.get('/register',function(req,res){
    res.render('register');
});



app.post('/list', function(req,res){
    const itemName = req.body.newItem;

    const item = new Item({
        name:itemName,
    });

    User.findById(req.user.id, function(err, foundUser){
        if(err){
            console.log(err);
        } else {
            if(foundUser){
                foundUser.items.push(item);
                foundUser.save()
                res.redirect("/list");
            }
        }
    })
})

app.post('/delete', function(req,res){
    const checkedItemId = req.body.checkbox;
   
    User.findOneAndUpdate({'_id':req.user.id}, {$pull: {items: {_id:checkedItemId}}},function(err,result){
        if(!err){
            res.redirect('/list');
        }
    });
});

app.get('/list', function(req,res){
    if(req.isAuthenticated()){
        User.findById(req.user.id, function(err, foundUser){
            if(err){
                console.log(err);
            } else {
                if(foundUser){
                    res.render('list', {listTitle: 'To-Do ' + day, newListItems: foundUser.items});
                } else {
                    res.redirect('/');
                }
            }
        }
    )} else {
        res.redirect('/');
    }
});

app.get('/logout', function(req,res){
    req.logOut();
    res.redirect('/');
})

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function(){
   console.log('Server Started!');
});