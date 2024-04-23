import express from "express";
import {  get10Cards } from "../database";
import { Card } from "../types";

export default function mtgRouter() {
    const router = express.Router();

    router.get("/login", (req, res) => {
        res.render("login");
    });

    router.get("/home", async (req, res) => {
        const searchValue: string | undefined = typeof req.query.search === "string" ? req.query.search : undefined;
        let randomResults: Card[] = await get10Cards(searchValue); 
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