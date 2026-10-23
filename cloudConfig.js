const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary-v2");

console.log("Cloudinary configuration check:", {
    cloudNamePresent: !!process.env.CLOUD_NAME,
    apiKeyPresent: !!process.env.CLOUD_API_KEY,
    apiSecretPresent: !!process.env.CLOUD_API_SECRET,
});

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET,
});

const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "wanderlust_DEV",
        allowed_formats: ["png", "jpg", "jpeg", "webp"],
    },
});

module.exports = {
    cloudinary,
    storage,
};
