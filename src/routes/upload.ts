import { Router, Request, Response } from 'express';
import { requireAdmin } from '../middleware/auth.js';
import cloudinary from '../lib/cloudinary.js';
import { upload } from '../middleware/upload.js';

export const uploadRouter = Router();

uploadRouter.post('/', requireAdmin, upload.single('photo'), (req: Request, res: Response): void => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No image file provided' });
            return;
        }

        // Create an upload stream to Cloudinary
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'wimc-cafes' },
            (error, result) => {
                if (error || !result) {
                    console.error('Cloudinary upload error:', error);
                    res.status(500).json({ error: 'Failed to upload image' });
                    return;
                }
                res.status(200).json({ url: result.secure_url, public_id: result.public_id });
            }
        );

        // Pipe the buffer into the stream
        uploadStream.end(req.file.buffer);
    } catch (error) {
        console.error('Error in upload route:', error);
        res.status(500).json({ error: 'Internal server error during upload' });
    }
});
