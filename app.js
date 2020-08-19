//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const findOrCreate = require("mongoose-findorcreate");
const https = require("https");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const NaverStrategy = require("passport-naver").Strategy;
const methodOverride = require("method-override");
const _ = require("lodash");


const homeStartingContent = "안녕하세요. 간단하게 만들어본 제 블로그 입니다. 프론트엔드 부분은 Bootstrap을 이용하여 반응형 웹을 구현해 보았고 백엔드는 Node.js MongoDB/Mongoose를 이용하여 글을 포스팅 할 수 있게 만들어 보았습니다. 현재 URL에서 /compose 로 라우팅 하시면 글을 포스팅 할 수 있습니다.";
const aboutContent = "자기소개를 위한 짧은 페이지.";
const contactContent = "저에게 연락하실 일이 있으신가요?";

const app = express();

app.set('view engine', 'ejs');
mongoose.set("useFindAndModify", false);

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));
app.use(methodOverride("_method"));
app.use(session({
  secret: "warning suppression",
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

const dbPath = "내 mongodb atlas cluster 경로";
mongoose.connect(dbPath, {
  useNewUrlParser: true,
  useUnifiedTopology: tru로
});
const db = mongoose.connection;
db.once("open", (_) => {
  console.log("Database connected:", dbPath);
});
db.on("error", (err) => {
  console.error("connection error:", err);
});

const postsSchema = {
  title: String,
  content: String
};

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  googleId: String,
  naverId: String
});
/* Passport-local-mongoose plugin with 
  an option to handle email field instead of
  the default "username".
*/
userSchema.plugin(passportLocalMongoose, {
  usernameField: "email",
  errorMessages: {
    MissingPasswordError: 'No password was given',
    AttemptTooSoonError: 'Account is currently locked. Try again later',
    TooManyAttemptsError: 'Account locked due to too many failed login attempts',
    NoSaltValueStoredError: 'Authentication not possible. No salt value stored',
    IncorrectPasswordError: 'Password or username are incorrect',
    IncorrectUsernameError: 'Password or username are incorrect',
    MissingUsernameError: 'No username was given',
    UserExistsError: 'A user with the given username is already registered'
  }
});
userSchema.plugin(findOrCreate);
const Post = mongoose.model("Post", postsSchema);
const defaultPost = new Post({
  title: "Placeholder Title",
  content: "Placeholder Content"
});

passport.use(User.createStrategy());
passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID_GOOGLE,
  clientSecret: process.env.CLIENT_SECRET_GOOGLE,
  callbackURL: process.env.GOOGLE_CALLBACK,
  // Prevent Google+ deprecation warning with userProfileURL field.
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
}, function (accessToken, refreshToken, profile, cb) {
  console.log(profile);
  User.findOrCreate({
    googleId: profile.id
  }, function (err, user) {
    return cb(err, user);
  })
}));

passport.use(new NaverStrategy({
  clientID: process.env.CLIENT_ID_NAVER,
  clientSecret: process.env.CLIENT_SECRET_NAVER,
  callbackURL: process.env.NAVER_CALLBACK
}, function (accessToken, refreshToken, profile, cb) {
  console.log(profile);
  User.findOrCreate({
    naverId: profile.displayName
  }, function (err, user) {
    return cb(err, user);
  })
}));

/* Global setting for dynamic navbar
  Changing "sign-in" to "sign-out" based on
  log-in status.
*/
app.use((req, res, next) => {
  res.locals.loginStat = req.isAuthenticated();
  if (!res.locals.loginStat) {
    res.locals.failureReason = "";
  }
  next();
});

app.get("/", function (req, res) {

  const query = "seoul";
  const API_KEY = "내 openweathermap api key";
  const units = "metric"
  const url = "https://api.openweathermap.org/data/2.5/weather?q=" + query + "&units=" + units + "&appid=" + API_KEY;

  var weatherData, temp, weatherDescription, icon, imageURL;
  https.get(url, function (response) {
    console.log(response.statusCode);

    response.on("data", function (data) {
      weatherData = JSON.parse(data);
      temp = weatherData.main.temp;
      weatherDescription = weatherData.weather[0].description;
      icon = weatherData.weather[0].icon;
      imageURL = "http://openweathermap.org/img/wn/" + icon + "@2x.png";

      Post.find({}, function (err, foundPosts) {
        if (foundPosts.length === 0) {
          defaultPost.save();
          res.redirect('/');
        } else {
          res.render("home", {
            homestart: homeStartingContent,
            postContent: foundPosts,
            temperature: temp,
            weather: weatherDescription,
            imageURL: imageURL
          });
        }
      })
    })
  })

})
app.get("/auth/google",
  passport.authenticate("google", {
    scope: ["profile"]
  })
);

app.get("/auth/google/secrets",
  passport.authenticate("google", {
    failureRedirect: "/sign-in"
  }),
  function (req, res) {
    res.redirect("/");
  }
);

app.get("/auth/naver",
  passport.authenticate("naver", null), (req, res) => {
    console.log("네이버 로그인 인증경로 진입");
  }
);

app.get("/auth/naver/secrets", passport.authenticate("naver", {
  failureRedirect: "/sign-in"
}), function (req, res) {
  res.redirect("/");
});

app.get("/sign-in", function (req, res) {
  res.render("sign-in", {
    failureReason: loginFailMsg
  });
});

app.post("/sign-in", function (req, res) {
  const user = new User({
    email: req.body.email,
    password: req.body.password
  });
  req.login(user, function (err) {
    if (err) {
      loginFailMsg = err;
      console.log(err);
      return res.redirect("/sign-in");
    } else {
      passport.authenticate("local", {
        failureRedirect: "/loginFail",
        failureFlash: false
      })(req, res, function () {
        res.redirect("/");
      })
    }
  })
});

app.get("/loginFail", function (req, res){
  res.render("sign-in", {
    failureReason: "Wrong username or password."
  })
});

app.post("/register", function (req, res) {
  User.register(new User({
    email: req.body.email,
    username: req.body.name
  }), req.body.password, function (err, user) {
    if (err) {
      console.log(err);
    } else {
      console.log("Authentication initilized");
      console.log("User: " + user);
      // user.name = req.body.name;
      passport.authenticate("local")(req, res, function () {
        res.redirect("/");
      });
    }
  });
});

app.get("/sign-out", function (req, res) {
  req.logout();
  res.redirect("/");
});

app.get("/about", function (req, res) {
  res.render("about", {
    about: aboutContent
  });
})

app.get("/contact", function (req, res) {
  res.render("contact", {
    contact: contactContent
  });
})

app.get("/compose", function (req, res) {
  res.render("compose");
})

app.post("/compose", function (req, res) {
  // res.render("compose");

  const post = new Post({
    title: req.body.postTitle,
    content: req.body.postBody
  });
  post.save(function (err) {
    if (!err) {
      res.redirect("/");
    }
  });
})

app.get("/posts/:postID", function (req, res) {
  const postID = req.params.postID;
  Post.findOne({
    _id: postID
  }, function (err, foundPost) {
    if (!err) {
      console.log("Post found");
      res.render("post", {
        postContent: foundPost
      })
    } else {
      console.log("The page doesn't exist");
    }
  })
})

app.get("/posts/:postID/edit", function (req, res) {
  const postID = req.params.postID;
  Post.findById(postID, function(err, foundPost) {
    if (!err) {
      res.render("edit", {postContent: foundPost})
    } else {
      console.log("This page doesn't exist");
    }
  })
})

app.put("/posts/:postID", function (req, res) {
  const postID = req.params.postID;
  console.log("Update route entered.");
  Post.findByIdAndUpdate(postID, {
    title: req.body.postTitle,
    content: req.body.postBody
  }, function (err, foundPost) {
    if (!err) {
      res.redirect("/posts/" + postID);
    } else {
      console.log("Error: " + err);
    }
  })
})

app.delete("/posts/:postID", function (req, res) {
  const postID = req.params.postID;
  console.log("DELETE route entered.");
  Post.findByIdAndDelete(postID, function (err, deletedPost){
    if (!err) {
      console.log(deletedPost + " has been deleted from the db.");
      res.redirect("/");
    } else {
      console.log("Could not delete the post with following error: \n" + err);
    }
  });
})

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
var server = app.listen(port, function () {
  var host = server.address().address;
  console.log("Server started at http://%s:%s", host, port);
});