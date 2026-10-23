const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const Listing = require("../models/listing.js"); // to connect with the listing
const {isLoggedIn, isOwner, validateListing} = require("../middleware.js");

const listingController  = require("../controllers/listing.js");
const multer = require('multer');
const {storage} = require("../cloudConfig.js");
const upload = multer({ storage });

router
    .route("/")
    .get(wrapAsync(listingController.index))
    .post(
    isLoggedIn,
    (req, res, next) => {
        console.log("POST /listings reached");

        upload.single("listing[image]")(req, res, (err) => {
            if (err) {
                console.error("IMAGE UPLOAD ERROR:", err);
                return next(err);
            }

            console.log("Image upload completed");
            console.log("Uploaded file:", req.file ? {
                path: req.file.path,
                filename: req.file.filename
            } : "No file uploaded");

            next();
        });
    },
    (req, res, next) => {
        console.log("Listing validation starting");

        try {
            validateListing(req, res, next);
        } catch (err) {
            next(err);
        }
    },
    wrapAsync(listingController.createListing)
);

//New Route
router.get("/new",isLoggedIn, listingController.renderNewForm);

router.route("/:id")
    .get(wrapAsync(listingController.showListing))
    .put(isLoggedIn, isOwner, upload.single("listing[image]"), validateListing, wrapAsync(listingController.updateListing))
    .delete(isLoggedIn, isOwner, wrapAsync(listingController.destroyListing)
);

//edit Route
router.get("/:id/edit",isLoggedIn, isOwner, wrapAsync(listingController.renderEditForm));

module.exports = router;