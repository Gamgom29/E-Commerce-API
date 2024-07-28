const express = require('express');
const router = express.Router();
const Product = require('../model/product');
const multer = require('multer');
const { uploadProduct } = require('../uploadFile');
const asyncHandler = require('express-async-handler');
const { BASE_URL } = require('./constants');
const verifyToken = require('../middlewares/verify_token_middleware');

const { storage, upload } = require('../appwrite');
const { InputFile } = require('node-appwrite/file');

// Get all products
router.get('/', verifyToken, asyncHandler(async (req, res) => {
    try {
        const products = await Product.find()
            .populate('proCategoryId', 'id name')
            .populate('proSubCategoryId', 'id name')
            .populate('proBrandId', 'id name')
            .populate('proVariantTypeId', 'id type')
            .populate('proVariantId', 'id name');
        res.json({ success: true, message: "Products retrieved successfully.", data: products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Get a product by ID
router.get('/:id', verifyToken, asyncHandler(async (req, res) => {
    try {
        const productID = req.params.id;
        const product = await Product.findById(productID)
            .populate('proCategoryId', 'id name')
            .populate('proSubCategoryId', 'id name')
            .populate('proBrandId', 'id name')
            .populate('proVariantTypeId', 'id name')
            .populate('proVariantId', 'id name');
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found." });
        }
        res.json({ success: true, message: "Product retrieved successfully.", data: product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));



// create new product

router.post('/', verifyToken, upload.fields([{ name: 'image1' }, { name: 'image2' }, { name: 'image3' }, { name: 'image4' }, { name: 'image5' }]), asyncHandler(async (req, res) => {
    try {
        // Extract product data from the request body
        const { name, description, quantity, price, offerPrice, proCategoryId, proSubCategoryId, proBrandId, proVariantTypeId, proVariantId } = req.body;

        // Check if any required fields are missing
        if (!name || !quantity || !price || !proCategoryId || !proSubCategoryId) {
            return res.status(400).json({ success: false, message: "Required fields are missing.", });
        }

        // Initialize an array to store image URLs
        const imageUrls = [];

        // Define an array to hold the upload promises
        const uploadPromises = [];

        // Iterate over the file fields
        const fields = ['image1', 'image2', 'image3', 'image4', 'image5'];
        fields.forEach((field, index) => {
            if (req.files[field] && req.files[field].length > 0) {
                const file = req.files[field][0];
                const fileId = `image_${Date.now()}`;
                const uploadPromise = storage.createFile(
                    process.env.APPWRITE_BUCKET_ID,
                    fileId,
                    InputFile.fromBuffer(file.buffer, file.originalname)
                ).then(response => {
                    const imageUrl = `${process.env.APPWRITE_API_URL}/storage/buckets/${process.env.APPWRITE_BUCKET_ID}/files/${response.$id}/view?project=${process.env.APPWRITE_PROJECT_ID}&mode=admin`;
                    imageUrls.push({ image: index + 1, url: imageUrl });
                    console.log(imageUrl);
                });

                uploadPromises.push(uploadPromise);
            }
        });

        // Wait for all uploads to complete
        await Promise.all(uploadPromises);

        // Create a new product object with data
        const newProduct = new Product({
            name, description, quantity, price, offerPrice,
            proCategoryId, proSubCategoryId, proBrandId, proVariantTypeId, proVariantId,
            images: imageUrls
        });

        // Save the new product to the database
        await newProduct.save();

        // Send a success response back to the client
        res.json({ success: true, message: "Product created successfully.", data: null });

    } catch (error) {
        // Handle any errors that occur during the process
        console.error("Error creating product:", error);
        res.status(500).json({ success: false, message: error.message });
    }
}));


// Update a product
// router.put('/:id', verifyToken, upload.fields([{ name: 'image1' }, { name: 'image2' }, { name: 'image3' }, { name: 'image4' }, { name: 'image5' }]), asyncHandler(async (req, res) => {
//     const productId = req.params.id;
//     try {

//         if (err) {
//             console.log(`Update product: ${err}`);
//             return res.status(500).json({ success: false, message: err.message });
//         }

//         const { name, description, quantity, price, offerPrice, proCategoryId, proSubCategoryId, proBrandId, proVariantTypeId, proVariantId, imageUrls } = req.body;

//         // Find the product by ID
//         const productToUpdate = await Product.findById(productId);
//         if (!productToUpdate) {
//             return res.status(404).json({ success: false, message: "Product not found." });
//         }
//         // Update product properties if provided
//         productToUpdate.name = name || productToUpdate.name;
//         productToUpdate.description = description || productToUpdate.description;
//         productToUpdate.quantity = quantity || productToUpdate.quantity;
//         productToUpdate.price = price || productToUpdate.price;
//         productToUpdate.offerPrice = offerPrice || productToUpdate.offerPrice;
//         productToUpdate.proCategoryId = proCategoryId || productToUpdate.proCategoryId;
//         productToUpdate.proSubCategoryId = proSubCategoryId || productToUpdate.proSubCategoryId;
//         productToUpdate.proBrandId = proBrandId || productToUpdate.proBrandId;
//         productToUpdate.proVariantTypeId = proVariantTypeId || productToUpdate.proVariantTypeId;
//         productToUpdate.proVariantId = proVariantId || productToUpdate.proVariantId;

//         if (!req.files) {
//             await productToUpdate.save();
//             res.json({ success: true, message: "Product updated successfully." });
//         }


//         // Iterate over the file fields to update images
//         const fields = ['image1', 'image2', 'image3', 'image4', 'image5'];
//         fields.forEach((field, index) => {
//             if (req.files[field] && req.files[field].length > 0) {
//                 const file = req.files[field][0];
//                 const imageUrl = `${BASE_URL}/image/products/${file.filename}`;
//                 // Update the specific image URL in the images array
//                 let imageEntry = productToUpdate.images.find(img => img.image === (index + 1));
//                 if (imageEntry) {
//                     imageEntry.url = imageUrl;
//                 } else {
//                     // If the image entry does not exist, add it
//                     productToUpdate.images.push({ image: index + 1, url: imageUrl });
//                 }
//             }
//         });

//         // Save the updated product
//         await productToUpdate.save();
//         res.json({ success: true, message: "Product updated successfully." });

//     } catch (error) {
//         console.error("Error updating product:", error);
//         res.status(500).json({ success: false, message: error.message });
//     }
// }));
router.put('/:id', verifyToken, upload.fields([{ name: 'image1' }, { name: 'image2' }, { name: 'image3' }, { name: 'image4' }, { name: 'image5' }]), asyncHandler(async (req, res) => {
    const productId = req.params.id;
    try {
        const { name, description, quantity, price, offerPrice, proCategoryId, proSubCategoryId, proBrandId, proVariantTypeId, proVariantId } = req.body;

        // Find the product by ID
        const productToUpdate = await Product.findById(productId);
        if (!productToUpdate) {
            return res.status(404).json({ success: false, message: "Product not found." });
        }

        // Update product properties if provided
        productToUpdate.name = name || productToUpdate.name;
        productToUpdate.description = description || productToUpdate.description;
        productToUpdate.quantity = quantity || productToUpdate.quantity;
        productToUpdate.price = price || productToUpdate.price;
        productToUpdate.offerPrice = offerPrice || productToUpdate.offerPrice;
        productToUpdate.proCategoryId = proCategoryId || productToUpdate.proCategoryId;
        productToUpdate.proSubCategoryId = proSubCategoryId || productToUpdate.proSubCategoryId;
        productToUpdate.proBrandId = proBrandId || productToUpdate.proBrandId;
        productToUpdate.proVariantTypeId = proVariantTypeId || productToUpdate.proVariantTypeId;
        productToUpdate.proVariantId = proVariantId || productToUpdate.proVariantId;

        // Process image updates
        if (req.files) {
            const fields = ['image1', 'image2', 'image3', 'image4', 'image5'];
            for (const field of fields) {
                if (req.files[field] && req.files[field].length > 0) {
                    const file = req.files[field][0];

                    const imageUrl = productToUpdate.images.find(img => img.image === field)?.url;
                    if (imageUrl) {
                        // Extract the file ID from the existing image URL
                        const fileId = extractFileId(imageUrl);

                        // Delete the old image file from storage
                        await storage.deleteFile(
                            `${process.env.APPWRITE_BUCKET_ID}`, // bucketId
                            fileId, // fileId
                        );
                    }

                    // Create a new file in storage
                    const finalFileId = `image_${Date.now()}`;
                    const response = await storage.createFile(
                        process.env.APPWRITE_BUCKET_ID,
                        finalFileId,
                        InputFile.fromBuffer(file.buffer, file.originalname),
                    );

                    // Generate the final file URL
                    const finalFileUrl = `${process.env.APPWRITE_API_URL}/storage/buckets/${process.env.APPWRITE_BUCKET_ID}/files/${finalFileId}/view?project=${process.env.APPWRITE_PROJECT_ID}&mode=admin`;

                    // Update the specific image URL in the images array
                    let imageEntry = productToUpdate.images.find(img => img.image === (fields.indexOf(field) + 1));
                    if (imageEntry) {
                        imageEntry.url = finalFileUrl;
                    } else if (productToUpdate.images.length < 5) {
                        productToUpdate.images.push({ image: fields.indexOf(field) + 1, url: finalFileUrl });
                    } else {
                        productToUpdate.images[fields.indexOf(field)].url = finalFileUrl;
                    }
                }
            }
        }

        // Save the updated product
        await productToUpdate.save();
        res.json({ success: true, message: "Product updated successfully." });

    } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).json({ success: false, message: error.message });
    }
}));


// Delete a product
router.delete('/:id', verifyToken, asyncHandler(async (req, res) => {
    const productID = req.params.id;
    try {
        const product = await Product.findByIdAndDelete(productID);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found." });
        }
        const imageUrls = product.images;



        // Iterate over the file fields
        imageUrls.forEach(async (imageUrl) => {
            const fileId = extractFileId(imageUrl.url);
            if (fileId) {
                const result = await storage.deleteFile(
                    `${process.env.APPWRITE_BUCKET_ID}`, // bucketId
                    fileId, // fileId
                );
            }
        });

        res.json({ success: true, message: "Product deleted successfully." });
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