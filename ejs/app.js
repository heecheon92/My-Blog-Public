//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const https = require("https");
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

const Post = mongoose.model("Post", postsSchema);
const defaultPost = new Post({
  title: "Placeholder Title",
  content: "Placeholder Content"
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