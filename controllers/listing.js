const Listing = require("../models/listing");
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({accessToken : mapToken});

module.exports.index = async (req, res) => {
    const search = req.query.search?.trim();

    let filter = {};

    if (search) {
        // Treat the search term as plain text
        const escapedSearch = search.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );

        filter = {
            $or: [
                { title: { $regex: escapedSearch, $options: "i" } },
                { location: { $regex: escapedSearch, $options: "i" } },
                { country: { $regex: escapedSearch, $options: "i" } }
            ]
        };
    }

    const allListings = await Listing.find(filter);

    res.render("listings/index.ejs", {
        allListings,
        search
    });
};

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

    res.render("listings/show.ejs", {
        listing,
        mapToken: process.env.MAP_TOKEN
    });
};


module.exports.createListing = async (req, res, next) => {
    try {
        const response = await geocodingClient.forwardGeocode({
            query: req.body.listing.location,
            limit: 2
        }).send();

        const features = response.body.features;

        if (!features || features.length === 0) {
            throw new Error("Location not found. Please enter a valid location.");
        }

        const newListing = new Listing(req.body.listing);
        newListing.owner = req.user._id;

        newListing.image = {
            url: req.file.path,
            filename: req.file.filename
        };

        newListing.geometry = features[0].geometry;

        await newListing.save();

        req.flash("success", "New Listing Created!");
        return res.redirect("/listings");

    } catch (err) {
        return next(err);
    }
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