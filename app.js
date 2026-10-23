const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

require("dotenv").config();

const express = require("express"); //1
const app = express(); 
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");//for put and delete
const ejsMate = require("ejs-mate"); // <-- it is used as a template engine --> 
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const MongoStore = require('connect-mongo').default;
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");

//-- it is the address of mongodb so that node.js and express.js can connect to it -->
// const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";
const dbUrl = process.env.ATLASDB_URL;

async function main() {
    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(dbUrl);
}

main()
    .then(() => {
        console.log("Connected to DB");

        app.listen(8080, () => {
            console.log("Server is listening on port 8080");
        });
    })
    .catch((err) => {
        console.error("MongoDB connection failed:", err);
    });

//this is to require the path from different directories
app.set("view engine", "ejs"); // This tell express <--"I am going to use EJS as my template engine for rendering pages." -->
app.set("views", path.join(__dirname, "views")); //This tell express <-- "Where are my view/template files located?" -->
app.use(express.urlencoded({extended: true}));  // this is used so that inside requests it can read url encoded data when we fetch data from req.params -->
app.use(methodOverride("_method")); //for put and delete requests
app.engine("ejs", ejsMate); // The boilerplate code is provided by this <-- ejsMate -->
app.use(express.static(path.join(__dirname, "/public"))); // It tells Express: <--"Make files inside the public folder accessible directly from the browser." -->

const store = MongoStore.create({
    mongoUrl: dbUrl,
    crypto : {
        secret: process.env.SECRET,
    },
    touchAfter: 24 * 3600,
})

store.on("error", (err) => {
    console.log("ERROR in MONGO SESSION STORE", err);
})

const  sessionOptions = {
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 100,
        maxAge:  7 * 24 * 60 * 60 * 100,
        httpOnly: true,
    },
};

// app.get("/", (req, res) => {
//     res.send("Hii, I am root");
// });

app.use(session(sessionOptions));
app.use(flash()); //remember the flash will come before routes

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
})

passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());



app.use("/listings", listingRouter); // these are routes //const listings = require("./routes/listing.js");
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);

app.use((req, res, next) => {
    next(new ExpressError(404, "Page Not Found!"));
});

//Error Handler
app.use((err, req, res, next) => {
    let {statusCode=500, message="something went wrong!"} = err;
    res.status(statusCode).render("Error.ejs", {message});
    // res.status(statusCode).send(message);
});
