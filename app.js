
require("dotenv").config();

// Keep this DNS workaround for MongoDB Atlas connectivity.
const dns = require("node:dns");
dns.setServers(["1.1.1.1", "1.0.0.1"]);

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");

const dbUrl = process.env.ATLASDB_URL;

// Express and EJS configuration
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "public")));

async function start() {
    if (!dbUrl) {
        throw new Error("ATLASDB_URL is missing. Add it to your environment variables.");
    }

    if (!process.env.SECRET) {
        throw new Error("SECRET is missing. Add it to your environment variables.");
    }

    await mongoose.connect(dbUrl, {
        family: 4,
        serverSelectionTimeoutMS: 10000
    });

    // Store sessions using the existing Mongoose MongoDB connection.
    const store = MongoStore.create({
        client: mongoose.connection.getClient(),
        crypto: { secret: process.env.SECRET },
        touchAfter: 24 * 3600
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
            httpOnly: true
        }
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

    // Routes
    app.use("/listings", listingRouter);
    app.use("/listings/:id/reviews", reviewRouter);
    app.use("/", userRouter);

    // 404 handler
    app.use((req, res, next) => {
        next(new ExpressError(404, "Page Not Found!"));
    });

    // Error handler
    app.use((err, req, res, next) => {
        const {
            statusCode = 500,
            message = "Something went wrong!"
        } = err;

        res.status(statusCode).render("Error.ejs", { message });
    });

    const PORT = process.env.PORT || 8080;

    app.listen(PORT, () => {
        console.log(`Server is listening on port ${PORT}`);
    });
}

start().catch(async (err) => {
    console.error("Application startup failed:", err);
    await mongoose.disconnect().catch(() => {});
    process.exitCode = 1;
});
