
// <--This file is used to connect the node and express with monoDB

const mongoose = require("mongoose");
const initData = require("./data.js"); //for getting the file from same directory we use single dot "."
const Listing = require("../models/listing.js"); // .. <-- this dot use when we redirect file from other directory -->

const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";

main()
    .then(() => {
        console.log("connected to DB");
    }).catch((err) => {
        console.log(err);
    });

    
async function main() {
    await mongoose.connect(MONGO_URL);
}

const initDB = async () => {
    await Listing.deleteMany({});
    initData.data = initData.data.map((obj) => ({...obj, owner: "6aca897bdd7d27a8c6d4eb54"}));
    await Listing.insertMany(initData.data);
    console.log("data was initialized");
};

initDB();