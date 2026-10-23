require("dotenv").config();

// Node's SRV resolver can fail with the network's configured DNS server.
// Use public resolvers so mongodb+srv Atlas hostnames can be discovered.
const dns = require("node:dns");
dns.setServers(["1.1.1.1", "1.0.0.1"]);

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

//this is to require the path from different directories
app.set("view engine", "ejs"); // This tell express <--"I am going to use EJS as my template engine for rendering pages." -->
app.set("views", path.join(__dirname, "views")); //This tell express <-- "Where are my view/template files located?" -->
app.use(express.urlencoded({extended: true}));  // this is used so that inside requests it can read url encoded data when we fetch data from req.params -->
app.use(methodOverride("_method")); //for put and delete requests
app.engine("ejs", ejsMate); // The boilerplate code is provided by this <-- ejsMate -->
app.use(express.static(path.join(__dirname, "/public"))); // It tells Express: <--"Make files inside the public folder accessible directly from the browser." -->

// app.get("/", (req, res) => {
//     res.send("Hii, I am root");
// });

async function start() {
    if (!dbUrl) {
        throw new Error("ATLASDB_URL is missing. Add it to your .env file.");
    }
    if (!process.env.SECRET) {
        throw new Error("SECRET is missing. Add it to your .env file.");
    }

    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(dbUrl, {
        family: 4,
        serverSelectionTimeoutMS: 10000
    });
    console.log("Connected to DB");

    // Reuse Mongoose's connection so sessions do not start a second Atlas connection.
    const store = MongoStore.create({
        client: mongoose.connection.getClient(),
        crypto: { secret: process.env.SECRET },
        touchAfter: 24 * 3600,
    });
    store.on("error", (err) => {
        console.error("MongoDB session store error:", err);
    });

    app.use(session({
        store,
        secret: process.env.SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 7 * 24 * 60 * 60 * 1000,
            httpOnly: true,
        },
    }));
    app.use(flash());
    app.use(passport.initialize());
    app.use(passport.session());

    app.use((req, res, next) => {
        res.locals.success = req.flash("success");
        res.locals.error = req.flash("error");
        res.locals.currUser = req.user;
        next();
    });

    passport.use(new LocalStrategy(User.authenticate()));
    passport.serializeUser(User.serializeUser());
    passport.deserializeUser(User.deserializeUser());

    app.use("/listings", listingRouter);
    app.use("/listings/:id/reviews", reviewRouter);
    app.use("/", userRouter);
    app.use((req, res, next) => next(new ExpressError(404, "Page Not Found!")));
    app.use((err, req, res, next) => {
        const { statusCode = 500, message = "something went wrong!" } = err;
        res.status(statusCode).render("Error.ejs", { message });
    });

    app.listen(8080, () => {
        console.log("Server is listening on port 8080");
    });
}

start().catch(async (err) => {
    console.error("Application startup failed:", err);
    await mongoose.disconnect().catch(() => {});
    process.exitCode = 1;
});
