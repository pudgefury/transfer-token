import { ethers } from "ethers";
import { default as dotenv } from "dotenv";
dotenv.config();
import abi from "./TestToken.abi.json" assert { type: "json" };
import { TESTTOKEN_ADDRESS } from "./constants.js";
import { default as http } from "node:http";

const tokenTransfer = async (to, amount) => {
  console.log(`Fulfilling  to transfer ${amount} to ${to} ...`);
  const network = ethers.providers.getNetwork("goerli");
  const provider = new ethers.providers.InfuraProvider(network, process.env.INFURA_API_KEY);

  const mnemonic = ethers.Wallet.fromMnemonic(process.env.WALLET_MNEMONIC);
  const wallet = new ethers.Wallet(mnemonic.privateKey, provider);

  const TestToken = new ethers.Contract(TESTTOKEN_ADDRESS, abi, wallet);

  const sender = wallet.getAddress();
  const recepient = to; //"0x637e10d84ca40B59250bb7758e45F2468fe7c4B7";

  const beforeEthers = Number(ethers.utils.formatEther(await provider.getBalance(sender)));
  console.log("Sender Ether Balance: >> ", beforeEthers);
  console.log("Sender TestToken Balance:>> ", ethers.utils.formatUnits(await TestToken.balanceOf(sender)));
  console.log("Recepient TestToken Balance:>> ", ethers.utils.formatUnits(await TestToken.balanceOf(recepient)));

  const tx = await TestToken.transfer(recepient, ethers.utils.parseUnits(amount.toString()));
  console.log("Tx:>> ", tx);
  const confirmedTx = await tx.wait();
  console.log("confirmed Tx:>> ", confirmedTx);

  console.log("Sender TestToken Balance:>> ", ethers.utils.formatUnits(await TestToken.balanceOf(sender)));
  console.log("Recepient TestToken Balance:>> ", ethers.utils.formatUnits(await TestToken.balanceOf(recepient)));
  const afterEthers = Number(ethers.utils.formatEther(await provider.getBalance(sender)));
  console.log("Sender Ether Balance: >> ", afterEthers);
  console.log("Ethers consumed :>> ", beforeEthers - afterEthers);
};

const server = http.createServer((req, res) => {
  // res.writeHead(200, { "Content-Type": "application/json" });
  try {
    console.log(req.method, req.url /*, req.headers*/);
    var body = "";
    req.on("readable", () => {
      const chunk = req.read();
      if (chunk) body += chunk;
    });
    req.on("end", async () => {
      if (req.method === "GET") {
        const content = `<h1>Hello. Try to use POST /api/transfer endpoint.</h1>`;
        res
          .writeHead(200, {
            "Content-Length": Buffer.byteLength(content),
            "Content-Type": "text/html",
          })
          .end(content);
      } else if (req.method === "POST") {
        if (req.url === "/api/transfer") {
          if (body === null) {
            res.writeHead(400, { "Content-Type": "application/json" }).end(JSON.stringify({ error: http.STATUS_CODES[400] }));
          } else {
            console.log("body:>> ", body);
            const reqBody = JSON.parse(body);
            console.log("reqBody:>> ", reqBody);
            if (reqBody?.to && reqBody?.amount) {
              await tokenTransfer(reqBody.to, reqBody.amount);
              res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ success: true }));
            } else {
              res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "bad request" }));
            }
          }
        } else {
          res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "bad request" }));
        }
      } else {
        res.writeHead(405, { "Content-Type": "application/json" }).end(JSON.stringify({ error: http.STATUS_CODES[405] }));
      }
    });
  } catch (err) {
    res.end(`{"error": "${err}"}`);
  }
  return;
});

server.listen(process.env.SERVER_PORT, () => {
  console.log(`Server listening on port ${process.env.SERVER_PORT} ...`);
});
