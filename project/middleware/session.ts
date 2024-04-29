import dotenv from "dotenv";
import session from "express-session";
import mongoDbSession from "connect-mongodb-session";


dotenv.config();
const MongoDBStore = mongoDbSession(session);

const mongoStore = new MongoDBStore({
    uri: process.env.URI ?? "mongodb://localhost:27017",
    collection: "sessions",
    databaseName: "tijdelijk",
});

mongoStore.on("error", (error) => {
    console.error(error);
});

declare module 'express-session' {
    export interface SessionData {
        username?: string;
    }
}

export default session({
    secret: process.env.SESSION_SECRET ?? "my-super-secret-secret",
    store: mongoStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60,
        httpOnly: true,
        sameSite: true,
        secure: true,
    }
});

