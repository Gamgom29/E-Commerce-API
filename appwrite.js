const { Client, Storage } = require('node-appwrite');
const multer = require('multer');

const api_url = process.env.APPWRITE_API_URL
const project_id = process.env.APPWRITE_PROJECT_ID
const api_key = process.env.APPWRITE_API_KEY

const client = new Client().setEndpoint(api_url).setProject(project_id).setKey(api_key);

const storage = new Storage(client)

const upload = multer({ storage: multer.memoryStorage() });

module.exports = {
    storage,
    upload,
};