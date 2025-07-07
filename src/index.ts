// @ts-ignore
import input from "input";
import { Api, sessions, TelegramClient } from "telegram-gifts";
import express from "express";
import cors from "cors";

import { env } from "./env.js";

import StarGift = Api.StarGift;
import StarGifts = Api.payments.StarGifts;
import GetStarGifts = Api.payments.GetStarGifts;

const stringSession = new sessions.StringSession(env.API_SESSION || "");

const client = new TelegramClient(stringSession, Number(env.API_ID), env.API_HASH, {
  connectionRetries: 5,
});

await client
  .start({
    phoneNumber: async () => env.PHONE_NUMBER,
    password: async () => "",
    phoneCode: async () => await input.text("Telegram code:"),
    onError: (err) => {
      console.error("Telegram error:", err);
      process.exit(0);
    },
  })
  .then(() => {
    if (!env.API_SESSION) {
      console.log(client.session.save());
    }
  });

const app = express();

interface Status {
  new_gifts: { id: string; supply: string; price: string }[];
  status: string;
  error: null | string;
  lastUpdate: number;
}

let status: Status = {
  new_gifts: [],
  status: "ok",
  error: null,
  lastUpdate: Date.now(),
};

app.get("/status", cors(), async (req, res) => {
  res.status(200).json(status);
});

app.listen(3001, () => {
  console.log("server listening on port 3001");
});

async function monitor() {
  try {
    const starGifts = (await client.invoke(new GetStarGifts({ hash: 0 }))) as StarGifts;
    const gifts = starGifts.gifts as StarGift[];

    const limitedGifts = gifts.filter((gift) => {
      return gift.limited;
    });

    const sortedLimitedGifts = limitedGifts.sort(
      (a, b) => b.stars.toJSNumber() - a.stars.toJSNumber(),
    );

    const notSoldOut = sortedLimitedGifts.filter(
      (gift) => gift.className === "StarGift" && !gift.soldOut,
    );

    if (notSoldOut.length) {
      status = {
        new_gifts: notSoldOut.map((item) => ({
          id: item.id.toString(),
          supply: (item.availabilityTotal || 0).toString(),
          price: item.stars.toString(),
        })),
        status: "ok",
        error: null,
        lastUpdate: Date.now(),
      };
    }
  } catch (error) {
    let errorMessage = "Неопознанная ошибка";
    console.log(error);
    try {
      errorMessage = JSON.stringify(error);
    } catch {}
    status = {
      new_gifts: status.new_gifts,
      status: "error",
      error: errorMessage,
      lastUpdate: Date.now(),
    };
  }
  setTimeout(() => monitor(), 250);
}

monitor();
