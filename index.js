require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: process.env.ORIGINS || "*",
  })
);

const PORT = process.env.PORT || 8080;
const SERVERS = process.env.SERVERS.split(",") || [];
const SERVERS_LOAD = SERVERS.map((server) => {
  return { name: server, count: 0 };
});

let current = 0;

const ABORT_TIME_OUT = process.env.ABORT_TIME_OUT * 1000 || 5000;

function newAbortSignal(timeoutMs) {
  const abortController = new AbortController();
  setTimeout(() => abortController.abort(), timeoutMs || 0);
  return abortController.signal;
}

const handler = async (code, language, input, res) => {
  const server = SERVERS[current];

  SERVERS_LOAD[current].count += 1;
  current === SERVERS.length - 1 ? (current = 0) : current++;

  console.log("Using server: " + server);

  try {
    const response = await axios({
      url: `${server}/`,
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: new URLSearchParams({
        code: code,
        language: language,
        input: input,
      }),
      signal: newAbortSignal(ABORT_TIME_OUT),
    });
    res.json(response.data);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error", timestamp: Date.now() });
  }
};

app.get("/", (_, res) => {
  res.send("Hello");
});

app.get("/servers", (_, res) => {
  res.json({ SERVERS });
});

app.post("/submit", (req, res) => {
  const { code, language, input } = req.body;
  return handler(code, language, input, res);
});

app.get("/load", (_, res) => {
  res.json({ SERVERS_LOAD });
});

app.listen(PORT, () => {
  console.log("Server listening");
});
