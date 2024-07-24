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
        const { posterName } = req.body;
        if (!posterName) {
            return res.status(400).json({ success: false, message: "Name is required." });
        }

        const file = req.file;
        const fileId = `image_${Date.now()}`;

        const response = await storage.createFile(
            process.env.APPWRITE_BUCKET_ID,
            fileId,
            InputFile.fromBuffer(file.buffer, file.originalname),
            [
                Permission.read(Role.any()),
                Permission.write(Role.any()),
                Permission.update(Role.any()),
                Permission.delete(Role.any())
            ],



        );
        fileUrl = `${process.env.APPWRITE_API_URL}/storage/buckets/${process.env.APPWRITE_BUCKET_ID}/files/${fileId}/view?project=${process.env.APPWRITE_PROJECT_ID}&mode=admin`;

        try {
            const newPoster = new Poster({
                posterName: posterName,
                imageUrl: fileUrl
            });
            await newPoster.save();
            res.json({ success: true, message: "Poster created successfully.", data: null });
        } catch (error) {
            console.error("Error creating Poster:", error);
            res.status(500).json({ success: false, message: error.message });
        }
        // res.json({
        //     message: 'File uploaded successfully',
        //     fileId: response.$id,
        //     fileUrl: fileUrl,
        //     // You can include more details from the response if needed
        // });
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).send('Error uploading file');
    }
}));
// try {
//     uploadPosters.single('img')(req, res, async function (err) {
// if (err instanceof multer.MulterError) {
//     if (err.code === 'LIMIT_FILE_SIZE') {
//         err.message = 'File size is too large. Maximum filesize is 5MB.';
//     }
//     console.log(`Add poster: ${err}`);
//     return res.json({ success: false, message: err });
// } else if (err) {
//     console.log(`Add poster: ${err}`);
//     return res.json({ success: false, message: err });
// }
//         const { posterName } = req.body;
//         let imageUrl = 'no_url';
//         if (req.file) {
//             imageUrl = `${BASE_URL}/image/poster/${req.file.filename}`;
//         }

//         if (!posterName) {
//             return res.status(400).json({ success: false, message: "Name is required." });
//         }

//         try {
//             const newPoster = new Poster({
//                 posterName: posterName,
//                 imageUrl: imageUrl
//             });
//             await newPoster.save();
//             res.json({ success: true, message: "Poster created successfully.", data: null });
//         } catch (error) {
//             console.error("Error creating Poster:", error);
//             res.status(500).json({ success: false, message: error.message });
//         }

//     });

// } catch (err) {
//     console.log(`Error creating Poster: ${err.message}`);
//     return res.status(500).json({ success: false, message: err.message });
// }

// Update a poster
router.put('/:id', verifyToken, asyncHandler(async (req, res) => {
    try {
        const categoryID = req.params.id;


        const { posterName, } = req.body;

        let image = req.body.image;



        if (!posterName || !image) {
            return res.status(400).json({ success: false, message: "Name and image are required." });
        }

        try {

            const fileId = extractFileId(image);
            const result = await storage.updateFile(
                process.env.APPWRITE_BUCKET_ID, // bucketId
                fileId, // fileId
            );
            const updatedPoster = await Poster.findByIdAndUpdate(categoryID, { posterName: posterName, imageUrl: result }, { new: true });
            if (!updatedPoster) {
                return res.status(404).json({ success: false, message: "Poster not found." });
            }

            res.json({ success: true, message: "Poster updated successfully.", data: null });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }



    } catch (err) {
        console.log(`Error updating poster: ${err.message}`);
        return res.status(500).json({ success: false, message: err.message });
    }
}));

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