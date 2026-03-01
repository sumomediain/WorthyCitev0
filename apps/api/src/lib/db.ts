import mongoose from "mongoose";
import dotenv from "dotenv";
import { MongoMemoryServer } from "mongodb-memory-server";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/citecore";

export const connectDB = async () => {
    try {
        let uri = MONGODB_URI;

        if (process.env.MOCK_SERVICES === "true") {
            const mongod = await MongoMemoryServer.create();
            uri = mongod.getUri();
            console.log(`[Localhost] Mocking MongoDB in-memory: ${uri}`);
        }

        const conn = await mongoose.connect(uri);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error: any) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        process.exit(1);
    }
};
