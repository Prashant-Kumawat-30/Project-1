const Listing = require("../models/listing");
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({accessToken : mapToken});

module.exports.index = async (req, res) => {
    const allListings = await Listing.find({});
    res.render("listings/index.ejs", {allListings}); //<-- use listings/index.ejs not /index.ejs because we laready have view engine 
}

module.exports.renderNewForm = (req, res) =>{
    res.render("listings/new.ejs");
}

module.exports.showListing = async (req, res) => {
    let { id } = req.params;

    const listing = await Listing.findById(id)
        .populate({ path: "reviews", populate: { path: "author" } })
        .populate("owner");

    if (!listing) {
        req.flash("error", "Listing you requested for does not exist!");
        return res.redirect("/listings");
    }

    console.log("Listing geometry from database:", listing.geometry);
    console.log("Coordinates from database:", listing.geometry.coordinates);

    res.render("listings/show.ejs", {
        listing,
        mapToken: process.env.MAP_TOKEN
    });
};

module.exports.createListing = async (req, res, next) => {
    let response;

    try {
        response = await geocodingClient.forwardGeocode({
            query: req.body.listing.location,
            limit: 2
        }).send();

        console.log("Mapbox geocoding succeeded");
        console.log("Geocoding features:", response.body.features);
    } catch (err) {
        console.error("MAPBOX GEOCODING ERROR:", {
            message: err.message,
            status: err.status,
            statusCode: err.statusCode,
        });

        return next(err);
    }

    // Keep the remainder of your existing function below this point.
};

module.exports.renderEditForm = async (req, res) => {
        let {id} = req.params;
        let listing = await Listing.findById(id);
        if(!listing){
            req.flash("error", "Listing you requested for does not exist!");
            return res.redirect("/listings");
        }

        let originalImageUrl = listing.image.url;
        originalImageUrl.replace("/upload", "upload/h_300, w_250");
        res.render("listings/edit.ejs", {listing, originalImageUrl});
}

module.exports.updateListing = async (req, res) => {
    let {id} = req.params;
    let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing});

    if(typeof req.file !== "undefined"){
        let url = req.file.path;
        let filename = req.file.filename;
        listing.image = {url, filename};
        await listing.save();
    }
    req.flash("success", "Listing Updated!")
    res.redirect(`/listings/${id}`);
}

module.exports.destroyListing = async (req, res) => {
    let {id} = req.params;
    let deletedListing = await Listing.findByIdAndDelete(id);
    req.flash("success", "Listing Deleted!")
    console.log(deletedListing);
    res.redirect("/listings");
}