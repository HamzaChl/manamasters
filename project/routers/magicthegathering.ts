import express from "express";
import { uri, client, collection } from "..";
import { Card } from "../types";
import { CollationOptions, Collection } from "mongodb";
import { randomBytes } from "crypto";

export default function mtgRouter() {
    const router = express.Router();

    router.get("/login", (req, res) => {
        res.render("login");
    });

    router.get("/home", async (req, res) => {
        let randomResults: any[] = []; // any aanpassen naar juiste interface wil niet werken
        try {
            await client.connect();          
            randomResults = await collection.aggregate([{ $sample: { size: 10 } }]).toArray();
        } catch (error: any) {
            console.log(error);
        } finally {
            await client.close();
        };
        res.render("home", {
            active: "Home",
            cards: randomResults,
        });
    });

    router.get("/decks", (req, res) => {
        res.render("decks", {
            active:  "Decks"
        });
    });

    router.get("/deck", (req, res) => {
        res.render("decksindividueel", {
            active: "Deck"
        });
    });
    

    router.get("/drawtest", (req, res) => {
        res.render("drawtest", {
            active: "Drawtest"
        });
    });
    
    
    return router;
};