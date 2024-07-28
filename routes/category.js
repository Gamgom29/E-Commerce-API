const express = require('express');
const router = express.Router();
const Category = require('../model/category');
const SubCategory = require('../model/subCategory');
const Product = require('../model/product');
const { uploadCategory } = require('../uploadFile');
const multer = require('multer');
const asyncHandler = require('express-async-handler');
const { BASE_URL } = require('./constants');
const verifyToken = require('../middlewares/verify_token_middleware');
const { storage, upload } = require('../appwrite');
const { InputFile } = require('node-appwrite/file');


// Get all categories
router.get('/', verifyToken, asyncHandler(async (req, res) => {
    try {
        const categories = await Category.find();
        res.json({ success: true, message: "Categories retrieved successfully.", data: categories });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Get a category by ID
router.get('/:id', verifyToken, asyncHandler(async (req, res) => {
    try {
        const categoryID = req.params.id;
        const category = await Category.findById(categoryID);
        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found." });
        }
        res.json({ success: true, message: "Category retrieved successfully.", data: category });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Create a new category with image upload
router.post('/', verifyToken, upload.single('image'), asyncHandler(async (req, res) => {
    try {

        const { name } = req.body;


        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }


        if (!name) {
            return res.status(400).json({ success: false, message: "Name is required." });
        }

        const file = req.file;
        const fileId = `image_${Date.now()}`;
        const response = await storage.createFile(
            process.env.APPWRITE_BUCKET_ID,
            fileId,
            InputFile.fromBuffer(file.buffer, file.originalname),


        );
        fileUrl = `${process.env.APPWRITE_API_URL}/storage/buckets/${process.env.APPWRITE_BUCKET_ID}/files/${response.$id}/view?project=${process.env.APPWRITE_PROJECT_ID}&mode=admin`;

        try {
            const newCategory = new Category({
                name: name,
                image: fileUrl
            });
            await newCategory.save();
            res.json({ success: true, message: "Category created successfully.", data: null });
        } catch (error) {
            console.error("Error creating category:", error);
            res.status(500).json({ success: false, message: error.message });
        }


    } catch (err) {
        console.log(`Error creating category: ${err.message}`);
        return res.status(500).json({ success: false, message: err.message });
    }
}));

// Update a category
router.put('/:id', verifyToken, upload.single('image'), asyncHandler(async (req, res) => {
    try {
        const categoryID = req.params.id;


        const { name, imageUrl } = req.body;
        let file = req.file;
        if (!file) {
            const updatedCategory = await Category.findByIdAndUpdate(categoryID, { name: name, image: imageUrl }, { new: true });
            if (!updatedCategory) {
                return res.status(404).json({ success: false, message: "Category not found." });
            }
            res.json({ success: true, message: "Category updated successfully.", data: null });
        }

        if (!name || !imageUrl) {
            return res.status(400).json({ success: false, message: "Name and image are required." });
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
            const updatedCategory = await Category.findByIdAndUpdate(categoryID, { name: name, image: finalFileUrl }, { new: true });
            if (!updatedCategory) {
                return res.status(404).json({ success: false, message: "Category not found." });
            }
            res.json({ success: true, message: "Category updated successfully.", data: null });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }



    } catch (err) {
        console.log(`Error updating category: ${err.message}`);
        return res.status(500).json({ success: false, message: err.message });
    }
}));

// Delete a category
router.delete('/:id', verifyToken, asyncHandler(async (req, res) => {
    try {
        const categoryID = req.params.id;

        // Check if any subcategories reference this category
        const subcategories = await SubCategory.find({ categoryId: categoryID });
        if (subcategories.length > 0) {
            return res.status(400).json({ success: false, message: "Cannot delete category. Subcategories are referencing it." });
        }

        // Check if any products reference this category
        const products = await Product.find({ proCategoryId: categoryID });
        if (products.length > 0) {
            return res.status(400).json({ success: false, message: "Cannot delete category. Products are referencing it." });
        }

        // If no subcategories or products are referencing the category, proceed with deletion

        const category = await Category.findByIdAndDelete(categoryID);
        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found." });
        }
        const fileId = extractFileId(category.image);
        if (fileId) {
            const result = await storage.deleteFile(
                `${process.env.APPWRITE_BUCKET_ID}`, // bucketId
                fileId, // fileId
            );
        }
        res.json({ success: true, message: "Category deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));



function extractFileId(url) {
    const pattern = /\/files\/([^\/]+)\/view/;
    const match = url.match(pattern);
    if (match) {
        console.log(match[1]);
        return match[1];
    }
    return null;
}



module.exports = router;
