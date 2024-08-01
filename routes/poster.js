const express = require('express');
const router = express.Router();
const Poster = require('../model/poster');

const { uploadPosters } = require('../uploadFile');
const multer = require('multer');
const asyncHandler = require('express-async-handler');
const { BASE_URL } = require('./constants');
const verifyToken = require('../middlewares/verify_token_middleware');
const { storage, upload } = require('../appwrite');
const { InputFile } = require('node-appwrite/file');
const { Permission, Role } = require('node-appwrite');

// Get all posters
router.get('/', verifyToken, asyncHandler(async (req, res) => {
    try {
        const posters = await Poster.find({});
        res.json({ success: true, message: "Posters retrieved successfully.", data: posters });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Get a poster by ID
router.get('/:id', verifyToken, asyncHandler(async (req, res) => {
    try {
        const posterID = req.params.id;
        const poster = await Poster.findById(posterID);
        if (!poster) {
            return res.status(404).json({ success: false, message: "Poster not found." });
        }
        res.json({ success: true, message: "Poster retrieved successfully.", data: poster });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Create a new poster
router.post('/', verifyToken, upload.single('image'), asyncHandler(async (req, res) => {
    try {

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }
        const { posterName, productId } = req.body;
        if (!posterName) {
            return res.status(400).json({ success: false, message: "Name is required." });
        }

        const file = req.file;
        const fileId = `image_${Date.now()}`;

        const response = await storage.createFile(
            process.env.APPWRITE_BUCKET_ID,
            fileId,
            InputFile.fromBuffer(file.buffer, file.originalname),
        );
        fileUrl = `${process.env.APPWRITE_API_URL}/storage/buckets/${process.env.APPWRITE_BUCKET_ID}/files/${fileId}/view?project=${process.env.APPWRITE_PROJECT_ID}&mode=admin`;

        try {
            const newPoster = new Poster({
                posterName: posterName,
                imageUrl: fileUrl,
                productId: productId
            });
            await newPoster.save();
            res.json({ success: true, message: "Poster created successfully.", data: null });
        } catch (error) {
            console.error("Error creating Poster:", error);
            res.status(500).json({ success: false, message: error.message });
        }

    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).send('Error uploading file');
    }
}));


// Update a poster
router.put('/:id', verifyToken, upload.single('image'), asyncHandler(async (req, res) => {
    try {
        const posterID = req.params.id;
        const { posterName, imageUrl, productId } = req.body;

        // Validate file
        const file = req.file;
        if (!file) {
            const updatedPoster = await Poster.findByIdAndUpdate(posterID, { posterName: posterName, imageUrl: imageUrl, productId: productId }, { new: true });

            if (!updatedPoster) {
                return res.status(404).json({ success: false, message: "Poster not found." });
            }

            return res.status(200).json({ success: true, message: "Poster updated successfully.", data: updatedPoster });

        }

        if (!posterName || !imageUrl) {
            return res.status(400).json({ success: false, message: "Name and image URL are required." });
        }

        try {
            const fileId = extractFileId(imageUrl);
            await storage.deleteFile(
                `${process.env.APPWRITE_BUCKET_ID}`, // bucketId
                fileId, // fileId
            );

            const finalFileId = `image_${Date.now()}`;
            const response = await storage.createFile(
                process.env.APPWRITE_BUCKET_ID,
                finalFileId,
                InputFile.fromBuffer(file.buffer, file.originalname),
            );

            const finalFileUrl = `${process.env.APPWRITE_API_URL}/storage/buckets/${process.env.APPWRITE_BUCKET_ID}/files/${finalFileId}/view?project=${process.env.APPWRITE_PROJECT_ID}&mode=admin`;
            const updatedPoster = await Poster.findByIdAndUpdate(posterID, { posterName: posterName, imageUrl: finalFileUrl, productId: productId }, { new: true });

            if (!updatedPoster) {
                return res.status(404).json({ success: false, message: "Poster not found." });
            }

            return res.status(200).json({ success: true, message: "Poster updated successfully.", data: updatedPoster });

        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    } catch (err) {
        console.log(`Error updating poster: ${err.message}`);
        return res.status(500).json({ success: false, message: err.message });
    }
}));
//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// router.put('/:id', verifyToken, upload.single('image'), asyncHandler(async (req, res) => {
//     try {
//         const posterID = req.params.id;
//         const { posterName, imageUrl } = req.body;
//         // Validate file
//         const file = req.file;
//         if (!file) {
//             return res.status(400).json({ success: false, message: "Image is required." });
//         }
//         try {
//             const fileId = extractFileId(imageUrl);
//             const result = await storage.deleteFile(
//                 `${process.env.APPWRITE_BUCKET_ID}`, // bucketId
//                 fileId, // fileId
//             );
//             const finalFileId = `image_${Date.now()}`;

//             const response = await storage.createFile(
//                 process.env.APPWRITE_BUCKET_ID,
//                 finalFileId,
//                 InputFile.fromBuffer(file.buffer, file.originalname),
//             );


//             const finalFileUrl = `${process.env.APPWRITE_API_URL}/storage/buckets/${process.env.APPWRITE_BUCKET_ID}/files/${finalFileId}/view?project=${process.env.APPWRITE_PROJECT_ID}&mode=admin`;
//             const updatedPoster = await Poster.findByIdAndUpdate(posterID, { posterName: posterName, imageUrl: finalFileUrl }, { new: true });
//             if (!updatedPoster) {
//                 return res.status(404).json({ success: false, message: "Poster not found." });
//             }

//         } catch (error) {
//             res.status(500).json({ success: false, message: error.message });
//         }
//     } catch (err) {
//         console.log(`Error updating poster: ${err.message}`);
//         return res.status(500).json({ success: false, message: err.message });
//     }
// }));
//!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// Delete a poster
router.delete('/:id', verifyToken, asyncHandler(async (req, res) => {
    const posterID = req.params.id;
    try {

        const deletedPoster = await Poster.findByIdAndDelete(posterID);


        if (!deletedPoster) {
            return res.status(404).json({ success: false, message: "Poster not found." });
        }
        const fileId = extractFileId(deletedPoster.imageUrl);
        if (fileId) {
            const result = await storage.deleteFile(
                `${process.env.APPWRITE_BUCKET_ID}`, // bucketId
                fileId, // fileId
            );
        }
        res.json({ success: true, message: "Poster deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

module.exports = router;



function extractFileId(url) {
    const pattern = /\/files\/([^\/]+)\/view/;
    const match = url.match(pattern);
    if (match) {
        console.log(match[1]);
        return match[1];
    }
    return null;
}