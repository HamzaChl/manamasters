import { MongoClient, Collection, WithId } from "mongodb";
import { AddDeck, ApiCard, Card, Deck, User } from "./types";
import dotenv from "dotenv";
import bcrypt from 'bcrypt';
import { log } from "console";


dotenv.config();
const saltRounds: number = 10;

const uri: string = process.env.URI ?? "mongodb://localhost:27017";
const client = new MongoClient(uri);
const collectionCards: Collection<Card> = client.db("tijdelijk").collection<Card>("mtg");
const collectionUsers: Collection<User> = client.db("tijdelijk").collection<User>("Usersmtg");
const collecionDecks: Collection<Deck> = client.db("tijdelijk").collection<Deck>("UserDecks");

async function getAllCards() {
  const amountCards: number = await collectionCards.countDocuments();
  if (amountCards === 0) {
    for (let i = 0; i < 821; i++) {
      const response = await fetch(
        `https://api.magicthegathering.io/v1/cards?page=${i}`
      );
      const data: ApiCard[] = (await response.json()).cards;
      let filteredData: Card[] = [];      
      for (const card of data) {
        if (card.imageUrl) {
          const correctedCard: Card = {
            name: card.name,
            manaCost: card.manaCost,
            id: card.id,
            imageUrl: card.imageUrl,
            type: card.type,
            rarity: card.rarity,
            text: card.text
          }; 
          filteredData.push(correctedCard);
          
        };
      };   
      if (filteredData.length > 0) {
        collectionCards.insertMany(filteredData);
      };
    };
  } else {
    console.log(`Database is already filled with ${amountCards}`);
  };
};

export async function get10Cards(searchValue?: string): Promise<Card[]> {
  if (searchValue) {
    await collectionCards.dropIndex("*");
    await collectionCards.createIndex({ name: "text", text: "text" });
    return await collectionCards
      .aggregate<Card>([
        { $match: { $text: { $search: searchValue } } },
        { $sample: { size: 10 } },
      ])
      .toArray();
  } else {
    return await collectionCards
      .aggregate<Card>([{ $sample: { size: 10 } }])
      .toArray();
  }
}

export async function getCardById(id: string) {
    return await collectionCards.findOne({id: id});
};

export async function addUser(user: User) {
  user = {
    username: user.username,
    password: await bcrypt.hash(user.password, saltRounds)
  };
  await collectionUsers.insertOne(user);
};

export async function findUser(user: User) {
  const foundUser: User | null = await findUserName(user);
  if (foundUser) {
    const passwordCorrect: boolean = await bcrypt.compare(user.password, foundUser.password);
    if (passwordCorrect) {
      return foundUser
    };
  };
  return null;
};

export async function findUserName(user: User) {
  return await collectionUsers.findOne({ username: user.username });
}

export async function insertCardInDeck(response: AddDeck, username: string) {
  const card: WithId<Card> | null = await collectionCards.findOne({
    id: response.id,
  });
  const deckNames = ["Desert Mirage", "Shadowed Labyrinth", "Inferno Blaze", "Mystic Marsh", "Verdant Canopy", "Celestial Heights"];

  if (card) {
    const deck: Deck | null = await collecionDecks.findOne({
      $and: [{ id: response.deck }, { username: username }],
    });
      if (deck) {
        const cards: Card[] = [];
        for (const deckCard of deck.cards) {
          if (deckCard.id === card.id) {
              cards.push(deckCard);              
          };
        };
        
        if (deck.cards.length === 60) {
          return `Limiet van kaarten op deck ${response.deck} bereikt.`;
        } else if (cards.length === 4 && !card.type.toLowerCase().includes("land")) {
          return `Limiet van deze kaart bereikt in deck ${response.deck}.`;
        };
        await collecionDecks.updateOne(
          { $and: [{ id: response.deck }, { username: username }] },
          { $push: { cards: card } }
        );
        return undefined;
      } else {
        let index: number = 0;
        if ( typeof response.deck === 'string' && !isNaN(parseInt(response.deck))) {
            index = parseInt(response.deck);
        }
        const deck: Deck = {
          id: response.deck,
          cards: [card],
          username: username,
          deckName: deckNames[index]
        };
        await collecionDecks.insertOne(deck);
        return undefined;
    };
  };
};


export async function deleteOneCard(deckNumber: string, cardId: string, username: string) {
    const deck: WithId<Deck> | null = await getDeck(deckNumber, username);
    if (deck) {
      const cardIndex = deck.cards.findIndex(card => card.id === cardId);
      if (cardIndex !== -1) {
          deck.cards.splice(cardIndex, 1);
          await collecionDecks.updateOne(
              { id: deckNumber, username: username },
              { $set: { cards: deck.cards } }
          );
      }
  }
};


export async function deleteCards(deckNumber: string, cardId: string, username: string) {
  await collecionDecks.updateOne(
      { $and: [{ id: deckNumber, username: username }] }, 
      { $pull: { cards: { id: cardId } } }
  );
};


export async function getDeck(deckNumber: string, username: string) {
  return await collecionDecks.findOne({$and: [{id: deckNumber}, {username: username}]});
}

export async function checkCardExists(deckNumber: string, cardId: string, username: string) {
  const deck: WithId<Deck> | null = await getDeck(deckNumber, username);
  if (deck) {
      const cardExists = deck.cards.some(card => card.id === cardId);
      return cardExists;
  }
  return false;
};

async function exit() {
  try {
    await client.close();
    console.log("Disconnected from database");
  } catch (error: any) {
    console.error(error.message);
  } finally {
    process.exit(0);
  }
}

export async function connect() {
  try {
    await client.connect();
    console.log("Connected to database");
    process.on("SIGINT", exit);
    await getAllCards();
  } catch (error: any) {
    console.error(error.message);
  }
}
